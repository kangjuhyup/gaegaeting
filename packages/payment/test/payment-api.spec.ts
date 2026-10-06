import { randomUUID } from "node:crypto";
import { jest } from "@jest/globals";
import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Pool } from "pg";
import { createInternalAuthAssertion } from "@core/auth-assertion";
import { AppModule } from "../src/app.module.js";
import { PAYMENT_CONFIG, PAYMENT_POOL } from "../src/common/runtime.module.js";
import { PaymentService } from "../src/payment/application/payment.service.js";
import { PaymentStore } from "../src/payment/application/payment-store.js";
import { ItemStore } from "../src/item/application/item-store.js";
import { ItemService } from "../src/item/application/item.service.js";
import {
  PaymentError,
  StorePort,
  type VerifiedPurchase,
} from "../src/payment/domain/payment.js";
import { ProofVault } from "../src/payment/infrastructure/proof-vault.js";
import { paymentMigration } from "../src/migrations/payment.migration.js";

const connectionString = process.env.PAYMENT_TEST_DATABASE_URL;
const pgDescribe = connectionString ? describe : describe.skip;
const secret = "payment-api-test-secret".repeat(3);
const key = "ab".repeat(32);

class TestStore extends StorePort {
  readonly provider = "APPLE" as const;
  proofs = new Map<string, VerifiedPurchase>();
  failFinalize = false;
  async verify(proof: string) {
    const purchase = this.proofs.get(proof);
    if (!purchase) throw new PaymentError("INVALID_STORE_PROOF");
    return purchase;
  }
  async finalize() {
    if (this.failFinalize) throw new PaymentError("STORE_UNAVAILABLE");
  }
  async notification(body: any) {
    if (
      body?.signature !== "test-provider-auth" ||
      !this.proofs.has(body.proof)
    )
      throw new PaymentError("INVALID_STORE_NOTIFICATION");
    return { eventId: body.id, proof: body.proof };
  }
  async refunds() {
    return [];
  }
}

pgDescribe("아이템·지갑·결제 API의 인증과 충전 흐름", () => {
  const schema = `payment_api_${randomUUID().replaceAll("-", "")}`;
  let admin: Pool,
    pool: Pool,
    app: INestApplication,
    url: string,
    payment: PaymentService;
  const apple = new TestStore();
  beforeAll(async () => {
    admin = new Pool({ connectionString });
    await admin.query(`CREATE SCHEMA "${schema}"`);
    pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
    for (const statement of paymentMigration.statements)
      await pool.query(
        statement.text,
        statement.values ? [...statement.values] : undefined,
      );
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PAYMENT_CONFIG)
      .useValue({
        environment: "Sandbox",
        worker: false,
        encryptionKey: key,
        database: { connectionString },
        secret,
        port: 2802,
      })
      .overrideProvider(PAYMENT_POOL)
      .useValue(pool)
      .overrideProvider(ConfigService)
      .useValue({ get: () => secret })
      .overrideProvider(ItemService)
      .useFactory({
        inject: [ItemStore],
        factory: (store: ItemStore) =>
          new ItemService(store, ["APPLE", "GOOGLE"]),
      })
      .overrideProvider(PaymentService)
      .useFactory({
        inject: [PaymentStore, ItemService],
        factory: (store: PaymentStore, items: ItemService) =>
          new PaymentService(
            store,
            [apple],
            new ProofVault(key),
            "Sandbox",
            items,
          ),
      })
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    app.setGlobalPrefix("payment");
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.listen(0, "127.0.0.1");
    url = await app.getUrl();
    payment = app.get(PaymentService);
  });
  afterAll(async () => {
    if (app) await app.close();
    else if (pool) await pool.end();
    if (admin) {
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.end();
    }
  });
  beforeEach(async () => {
    jest.restoreAllMocks();
    apple.proofs.clear();
    apple.failFinalize = false;
    await pool.query(
      "TRUNCATE payment_identity,payment_intent,payment_wallet,payment_purchase,payment_job,payment_refund_tombstone,payment_reconciliation CASCADE",
    );
  });
  function assertion(
    user = "user-a",
    scopes = ["payment:read", "payment:write"],
    audience = "payment",
  ) {
    return createInternalAuthAssertion(
      {
        userId: user,
        subject: `subject-${user}`,
        tenantId: "gaegaeting",
        scopes,
      },
      { secret, issuer: "gaegaeting-gateway", audience, ttlSeconds: 30 },
    );
  }
  async function gql(query: string, variables: any = {}, token = assertion()) {
    const response = await fetch(`${url}/payment/graphql`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-gaegaeting-principal": token,
      },
      body: JSON.stringify({ query, variables }),
    });
    return response.json() as Promise<any>;
  }
  async function prepare() {
    const body = await gql(
      "mutation($input:PrepareSnackPurchaseInput!){prepareSnackPurchase(input:$input){id accountToken offer{storeProductId snackQuantity}}}",
      { input: { provider: "APPLE", offerId: "apple-snacks-10" } },
    );
    expect(body.errors).toBeUndefined();
    return body.data.prepareSnackPurchase;
  }
  function proof(
    intent: any,
    state: VerifiedPurchase["state"] = "PURCHASED",
    extra: Partial<VerifiedPurchase> = {},
  ) {
    const raw = randomUUID();
    apple.proofs.set(raw, {
      provider: "APPLE",
      environment: "Sandbox",
      transactionId: randomUUID(),
      productId: intent.offer.storeProductId,
      accountToken: intent.accountToken,
      quantity: 1,
      purchasedAt: new Date(),
      state,
      ...extra,
    });
    return raw;
  }
  const confirm = (preparedId: string, raw: string, token?: string) =>
    gql(
      "mutation($input:ConfirmSnackPurchaseInput!){confirmSnackPurchase(input:$input){id state snackQuantity}}",
      { input: { preparedId, proof: raw } },
      token,
    );
  test("Gateway 내부 인증이 없거나 다른 서비스용 인증이면 잔액을 조회할 수 없다", async () => {
    for (const token of ["", assertion("user-a", undefined, "account")]) {
      const body = await gql("{mySnackWallet{balance}}", {}, token);
      expect(body.errors?.[0].extensions.code).toBe("UNAUTHENTICATED");
    }
  });
  test("상품·지갑 조회에는 읽기 권한, 구매 준비에는 쓰기 권한이 필요하다", async () => {
    const denied = await gql(
      "{snackProducts(provider:APPLE){id}}",
      {},
      assertion("user-a", []),
    );
    expect(denied.errors?.[0].extensions.code).toBe("FORBIDDEN");
    const read = await gql(
      "{snackProducts(provider:APPLE){snackQuantity priceKrw} mySnackWallet{balance}}",
      {},
      assertion("user-a", ["payment:read"]),
    );
    expect(read.errors).toBeUndefined();
    expect(read.data.snackProducts).toHaveLength(3);
    expect(read.data.mySnackWallet.balance).toBe(0);
    const write = await gql(
      'mutation{prepareSnackPurchase(input:{provider:APPLE,offerId:"apple-snacks-10"}){id}}',
      {},
      assertion("user-a", ["payment:read"]),
    );
    expect(write.errors?.[0].extensions.code).toBe("FORBIDDEN");
  });
  test("앱이 금액·간식 수량을 구매 확정 입력으로 위조할 수 없다", async () => {
    const body = await gql(
      "mutation($input:ConfirmSnackPurchaseInput!){confirmSnackPurchase(input:$input){id}}",
      {
        input: {
          preparedId: "id",
          proof: "proof",
          snackQuantity: 100000,
          priceKrw: 1,
        },
      },
    );
    expect(body.errors?.[0].extensions.code).toBe("BAD_USER_INPUT");
  });
  test("동일 결제 동시 재요청은 10개만 충전하고 다른 계정은 결제·내역에 접근하지 못한다", async () => {
    const i = await prepare(),
      raw = proof(i);
    const bodies = await Promise.all([confirm(i.id, raw), confirm(i.id, raw)]);
    expect(bodies.every((body) => !body.errors)).toBe(true);
    expect(
      (await gql("{mySnackWallet{balance} mySnackTransactions{id}}")).data,
    ).toMatchObject({
      mySnackWallet: { balance: 10 },
      mySnackTransactions: [{ id: bodies[0].data.confirmSnackPurchase.id }],
    });
    const other = await confirm(i.id, raw, assertion("user-b"));
    expect(other.errors?.[0].extensions.code).toBe("PURCHASE_INTENT_NOT_FOUND");
    expect(
      (
        await gql(
          "{mySnackWallet{balance} mySnackTransactions{id}}",
          {},
          assertion("user-b"),
        )
      ).data,
    ).toMatchObject({ mySnackWallet: { balance: 0 }, mySnackTransactions: [] });
  });
  test("대기 결제 및 다른 환경·구매자 거래는 충전하지 않는다", async () => {
    const i = await prepare();
    expect(
      (await confirm(i.id, proof(i, "PENDING"))).data.confirmSnackPurchase,
    ).toMatchObject({ state: "PENDING", snackQuantity: 0 });
    for (const extra of [
      { environment: "Production" as const },
      { accountToken: randomUUID() },
    ]) {
      expect(
        (await confirm(i.id, proof(i, "PURCHASED", extra))).errors?.[0]
          .extensions.code,
      ).toBe("PURCHASE_MISMATCH");
    }
    expect(
      (await gql("{mySnackWallet{balance}}")).data.mySnackWallet.balance,
    ).toBe(0);
  });
  test("위조 알림을 거부하고 정상 알림은 암호화 저장 후 앱 없이 구매를 복구한다", async () => {
    const i = await prepare(),
      raw = proof(i);
    const send = (body: any) =>
      fetch(`${url}/payment/notifications/apple`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    expect((await send({ id: "event", proof: raw })).status).toBe(401);
    expect(
      (await send({ id: "event", proof: raw, signature: "test-provider-auth" }))
        .status,
    ).toBe(200);
    const row = (await pool.query("SELECT encrypted_proof FROM payment_job"))
      .rows[0];
    expect(row.encrypted_proof).not.toContain(raw);
    expect(
      (await gql("{mySnackWallet{balance}}")).data.mySnackWallet.balance,
    ).toBe(0);
    expect(await payment.processJobs()).toEqual({ completed: 1, failed: 0 });
    expect(
      (await gql("{mySnackWallet{balance}}")).data.mySnackWallet.balance,
    ).toBe(10);
    expect(
      (await send({ id: "event", proof: raw, signature: "test-provider-auth" }))
        .status,
    ).toBe(200);
    await payment.processJobs();
    expect(
      (await gql("{mySnackWallet{balance}}")).data.mySnackWallet.balance,
    ).toBe(10);
  });
  test("충전 커밋 후 스토어 후속 처리 실패는 재시도하며 간식을 다시 지급하지 않는다", async () => {
    const i = await prepare(),
      raw = proof(i);
    await confirm(i.id, raw);
    apple.failFinalize = true;
    expect(await payment.processJobs()).toEqual({ completed: 0, failed: 1 });
    expect(
      (await gql("{mySnackWallet{balance}}")).data.mySnackWallet.balance,
    ).toBe(10);
    await pool.query(
      "UPDATE payment_job SET next_attempt_at=now()-interval '1 second'",
    );
    apple.failFinalize = false;
    expect(await payment.processJobs()).toEqual({ completed: 1, failed: 0 });
    expect(
      (await gql("{mySnackWallet{balance}}")).data.mySnackWallet.balance,
    ).toBe(10);
  });
  test("후속 처리 전에 스토어가 환불하면 회수하고 작업을 종료한다", async () => {
    const i = await prepare(),
      raw = proof(i);
    await confirm(i.id, raw);
    apple.proofs.set(raw, { ...apple.proofs.get(raw)!, state: "REFUNDED" });
    expect(await payment.processJobs()).toEqual({ completed: 1, failed: 0 });
    expect(
      (await gql("{mySnackWallet{balance}}")).data.mySnackWallet.balance,
    ).toBe(0);
    expect(await payment.processJobs()).toEqual({ completed: 0, failed: 0 });
  });
  test("환불 대조는 저장된 진행 시각부터 이어서 수행하고 실패 시 진행하지 않는다", async () => {
    const prior = new Date(Date.now() - 2 * 86_400_000);
    await pool.query(
      "INSERT INTO payment_reconciliation(provider,last_checked_at) VALUES($1,$2)",
      ["APPLE", prior],
    );
    const lookup = jest.spyOn(apple, "refunds");
    await payment.reconcileRefunds();
    expect(lookup).toHaveBeenCalledWith(new Date(prior.getTime() - 3_600_000));
    const saved = (
      await pool.query("SELECT last_checked_at FROM payment_reconciliation")
    ).rows[0].last_checked_at;
    expect(saved.getTime()).toBeGreaterThan(prior.getTime());
    lookup.mockRejectedValueOnce(new PaymentError("STORE_UNAVAILABLE"));
    const logging = jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(payment.reconcileRefunds()).rejects.toMatchObject({
      code: "STORE_UNAVAILABLE",
    });
    expect(
      (await pool.query("SELECT last_checked_at FROM payment_reconciliation"))
        .rows[0].last_checked_at,
    ).toEqual(saved);
    expect(logging).toHaveBeenCalled();
  });
  test("환불 복구 공백이 보존 범위를 넘으면 임의로 최신 시각까지 건너뛰지 않는다", async () => {
    const prior = new Date(Date.now() - 181 * 86_400_000);
    await pool.query(
      "INSERT INTO payment_reconciliation(provider,last_checked_at) VALUES($1,$2)",
      ["APPLE", prior],
    );
    const lookup = jest.spyOn(apple, "refunds"),
      logging = jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(payment.reconcileRefunds()).rejects.toMatchObject({
      code: "REFUND_RECONCILIATION_WINDOW_EXCEEDED",
    });
    expect(lookup).not.toHaveBeenCalled();
    expect(
      (await pool.query("SELECT last_checked_at FROM payment_reconciliation"))
        .rows[0].last_checked_at,
    ).toEqual(prior);
    expect(logging.mock.calls[0][0]).toContain(
      "refund_reconciliation_requires_review",
    );
  });
});
