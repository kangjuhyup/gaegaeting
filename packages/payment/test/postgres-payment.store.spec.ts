import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { PostgresPaymentStore } from "../src/payment/infrastructure/persistence/postgres-payment.store.js";
import { PostgresItemStore } from "../src/item/infrastructure/postgres-item.store.js";
import { PostgresWalletStore } from "../src/wallet/infrastructure/postgres-wallet.store.js";
import { paymentMigration } from "../src/migrations/payment.migration.js";
import type { PreparedPurchase } from "../src/payment/application/payment-store.js";
import type {
  Provider,
  VerifiedPurchase,
} from "../src/payment/domain/payment.js";

// Never run against an implicit/default developer database; all writes use a random schema.
const connectionString = process.env.PAYMENT_TEST_DATABASE_URL;
const pgDescribe = connectionString ? describe : describe.skip;
pgDescribe("간식 결제와 지갑의 PostgreSQL 정책", () => {
  const schema = `payment_test_${randomUUID().replaceAll("-", "")}`;
  let admin: Pool;
  let pool: Pool;
  let store: PostgresPaymentStore;
  let items: PostgresItemStore;
  let wallets: PostgresWalletStore;
  beforeAll(async () => {
    admin = new Pool({ connectionString });
    await admin.query(`CREATE SCHEMA "${schema}"`);
    pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
    for (const statement of paymentMigration.statements)
      await pool.query(
        statement.text,
        statement.values ? [...statement.values] : undefined,
      );
    store = new PostgresPaymentStore(pool, "Sandbox");
    items = new PostgresItemStore(pool);
    wallets = new PostgresWalletStore(pool);
  });
  afterAll(async () => {
    if (store) await store.close();
    if (admin) {
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.end();
    }
  });
  beforeEach(async () => {
    await pool.query(
      "TRUNCATE payment_identity,payment_intent,payment_wallet,payment_purchase,payment_lot,payment_ledger,payment_refund_tombstone,payment_job,payment_reconciliation CASCADE",
    );
    await pool.query(
      "UPDATE payment_offer SET price_krw=p.base_price_krw,enabled=true,starts_at=NULL,ends_at=NULL,event_name=NULL FROM payment_product p WHERE p.id=product_id",
    );
    await pool.query("DELETE FROM payment_offer WHERE id LIKE 'event-%'");
  });
  async function intent(
    user = "user-a",
    provider: Provider = "APPLE",
    quantity = 10,
  ): Promise<PreparedPurchase> {
    return store.prepare(
      user,
      provider,
      `${provider.toLowerCase()}-snacks-${quantity}`,
    );
  }
  function verified(
    i: PreparedPurchase,
    overrides: Partial<VerifiedPurchase> = {},
  ): VerifiedPurchase {
    return {
      provider: i.provider,
      environment: "Sandbox",
      transactionId: randomUUID(),
      productId: i.offer.storeProductId,
      accountToken: i.accountToken,
      state: "PURCHASED",
      quantity: 1,
      purchasedAt: new Date(),
      storeOfferId: i.offer.storeOfferId,
      ...overrides,
    };
  }
  async function topup(user = "user-a", quantity = 10) {
    const i = await intent(user, "APPLE", quantity);
    const p = verified(i);
    return {
      i,
      p,
      purchase: await store.grant(i.id, user, p, "encrypted-proof"),
    };
  }
  test("iOS와 Android는 10·50·100개 기본 상품을 판매한다", async () => {
    for (const provider of ["APPLE", "GOOGLE"] as const) {
      expect(
        (await items.offers(provider)).map((o) => [
          o.snackQuantity,
          o.priceKrw,
        ]),
      ).toEqual([
        [10, 2000],
        [50, 6000],
        [100, 10000],
      ]);
    }
  });
  test("이벤트는 판매 기간을 적용하고 준비한 구매의 가격은 이후 변경되어도 유지한다", async () => {
    await pool.query(
      "UPDATE payment_offer SET price_krw=1500,event_name='가을' WHERE id='apple-snacks-10'",
    );
    const i = await intent();
    await pool.query(
      "UPDATE payment_offer SET price_krw=1000,ends_at=now()-interval '1 second' WHERE id='apple-snacks-10'",
    );
    expect((await items.offers("APPLE")).some((o) => o.id === i.offer.id)).toBe(
      false,
    );
    await expect(intent()).rejects.toMatchObject({ code: "OFFER_UNAVAILABLE" });
    expect(
      (await store.grant(i.id, i.userId, verified(i), "encrypted")).priceKrw,
    ).toBe(1500);
  });
  test("상품 간식 수량과 스토어 상품 매핑을 수정할 수 없다", async () => {
    await expect(
      pool.query(
        "UPDATE payment_product SET snack_quantity=999 WHERE id='snacks-10'",
      ),
    ).rejects.toThrow("immutable");
    await expect(
      pool.query(
        "UPDATE payment_offer SET store_product_id='other' WHERE id='apple-snacks-10'",
      ),
    ).rejects.toThrow("immutable");
    await expect(
      pool.query(
        "INSERT INTO payment_offer(id,product_id,provider,store_product_id,price_krw) VALUES('bad','snacks-50','APPLE','app.gaegaeting.snacks.10',1000)",
      ),
    ).rejects.toThrow();
    await expect(
      pool.query(
        "UPDATE payment_store_product SET product_id='snacks-50' WHERE provider='APPLE' AND store_product_id='app.gaegaeting.snacks.10'",
      ),
    ).rejects.toThrow("immutable");
  });
  test("중복 구매 확인과 알림이 동시에 도착해도 한 번만 충전한다", async () => {
    const i = await intent();
    const p = verified(i);
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, n) =>
        store.grant(
          n % 2 ? null : i.id,
          n % 2 ? null : i.userId,
          p,
          "encrypted",
        ),
      ),
    );
    expect(new Set(results.map((r) => r.id)).size).toBe(1);
    expect(await wallets.wallet(i.userId)).toEqual({
      balance: 10,
      availableBalance: 10,
      frozen: false,
    });
    expect(
      (
        await pool.query(
          "SELECT count(*)::int n FROM payment_ledger WHERE kind='GRANT'",
        )
      ).rows[0].n,
    ).toBe(1);
    expect(
      (
        await pool.query(
          "SELECT count(*)::int n FROM payment_job WHERE kind='FINALIZE'",
        )
      ).rows[0].n,
    ).toBe(1);
  });
  test("같은 사용자의 다른 구매 준비로 재확인해도 기존 충전 내역을 반환한다", async () => {
    const { p, purchase } = await topup();
    const other = await intent();
    expect((await store.grant(other.id, other.userId, p, "encrypted")).id).toBe(
      purchase.id,
    );
    expect((await wallets.wallet(other.userId)).balance).toBe(10);
  });
  test.each([
    ["다른 사용자", { accountToken: randomUUID() }, "PURCHASE_MISMATCH"],
    ["다른 상품", { productId: "invalid-sku" }, "PURCHASE_MISMATCH"],
    ["다른 스토어", { provider: "GOOGLE" }, "PURCHASE_MISMATCH"],
    ["다른 환경", { environment: "Production" }, "ENVIRONMENT_MISMATCH"],
    ["결제 대기", { state: "PENDING" }, "PURCHASE_NOT_COMPLETED"],
    ["여러 개 구매", { quantity: 2 }, "INVALID_PURCHASE_QUANTITY"],
  ])("%s 거래는 간식을 지급하지 않는다", async (_name, patch, code) => {
    const i = await intent();
    await expect(
      store.grant(
        i.id,
        i.userId,
        verified(i, patch as Partial<VerifiedPurchase>),
        "encrypted",
      ),
    ).rejects.toMatchObject({ code });
    expect((await wallets.wallet(i.userId)).balance).toBe(0);
  });
  test("거래보다 나중에 준비한 구매로 과거 결제를 충전할 수 없다", async () => {
    const i = await intent();
    const p = verified(i, { purchasedAt: new Date(Date.now() - 60000) });
    await expect(
      store.grant(i.id, i.userId, p, "encrypted"),
    ).rejects.toMatchObject({ code: "PURCHASE_MISMATCH" });
    await expect(store.grant(null, null, p, "encrypted")).rejects.toMatchObject(
      { code: "PURCHASE_INTENT_NOT_FOUND" },
    );
  });
  test("구매 준비가 없는 알림은 계정을 추측하여 충전하지 않는다", async () => {
    const i = await intent();
    const p = verified(i, { accountToken: randomUUID() });
    await expect(store.grant(null, null, p, "encrypted")).rejects.toMatchObject(
      { code: "PURCHASE_INTENT_NOT_FOUND" },
    );
  });
  test("Google 이벤트 구매는 해당 스토어 할인 식별자가 일치해야 충전한다", async () => {
    await pool.query(
      "INSERT INTO payment_offer(id,product_id,provider,store_product_id,store_offer_id,price_krw) VALUES('event-google','snacks-10','GOOGLE','app.gaegaeting.snacks.10','fall',1500)",
    );
    const i = await store.prepare("user-a", "GOOGLE", "event-google");
    await expect(
      store.grant(
        null,
        null,
        verified(i, { storeOfferId: "wrong" }),
        "encrypted",
      ),
    ).rejects.toMatchObject({ code: "PURCHASE_INTENT_NOT_FOUND" });
    expect(
      (await store.grant(null, null, verified(i), "encrypted")).priceKrw,
    ).toBe(1500);
  });
  test("환불 알림이 충전보다 먼저 도착하면 이후 충전을 차단한다", async () => {
    const i = await intent();
    const p = verified(i);
    expect(await store.refund({ ...p, state: "REFUNDED" })).toBeNull();
    await expect(
      store.grant(i.id, i.userId, p, "encrypted"),
    ).rejects.toMatchObject({ code: "PURCHASE_ALREADY_REFUNDED" });
    expect((await wallets.wallet(i.userId)).balance).toBe(0);
  });
  test("다른 계정이나 상품의 환불 알림은 충전 내역을 변경하지 않는다", async () => {
    const { p } = await topup();
    await expect(
      store.refund({ ...p, state: "REFUNDED", accountToken: randomUUID() }),
    ).rejects.toMatchObject({ code: "PURCHASE_MISMATCH" });
    expect((await wallets.wallet("user-a")).balance).toBe(10);
  });
  test("미사용 구매는 환불 예약 중 사용을 막고 환불을 한 번만 반영한다", async () => {
    const { p, purchase } = await topup();
    await store.requestRefund("user-a", purchase.id);
    expect(await wallets.wallet("user-a")).toEqual({
      balance: 10,
      availableBalance: 0,
      frozen: false,
    });
    await expect(
      wallets.spend("user-a", 1, "spend-reserved"),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_SNACKS" });
    await Promise.all([
      store.refund({ ...p, state: "REFUNDED" }),
      store.refund({ ...p, state: "REFUNDED" }),
    ]);
    expect(await wallets.wallet("user-a")).toEqual({
      balance: 0,
      availableBalance: 0,
      frozen: false,
    });
  });
  test("먼저 충전한 간식부터 사용하고 이후 충전해도 사용한 구매는 환불 요청할 수 없다", async () => {
    const first = await topup();
    await topup("user-a", 50);
    await wallets.spend("user-a", 3, "greeting-1");
    await expect(
      store.requestRefund("user-a", first.purchase.id),
    ).rejects.toMatchObject({ code: "PURCHASE_ALREADY_USED" });
    await topup();
    await expect(
      store.requestRefund("user-a", first.purchase.id),
    ).rejects.toMatchObject({ code: "PURCHASE_ALREADY_USED" });
    expect((await wallets.wallet("user-a")).balance).toBe(67);
  });
  test("사용한 구매가 스토어에서 강제 환불되면 남은 수량을 회수하고 지갑을 검토 대기 상태로 보류한다", async () => {
    const first = await topup();
    await topup("user-a", 50);
    await wallets.spend("user-a", 3, "greeting-1");
    const refunded = await store.refund({ ...first.p, state: "REFUNDED" });
    expect(refunded).toMatchObject({ state: "REFUNDED", refundReview: true });
    expect(await wallets.wallet("user-a")).toEqual({
      balance: 50,
      availableBalance: 0,
      frozen: true,
    });
    await expect(
      wallets.spend("user-a", 1, "greeting-2"),
    ).rejects.toMatchObject({
      code: "WALLET_FROZEN",
    });
    await topup();
    expect((await wallets.wallet("user-a")).frozen).toBe(true);
  });
  test("늦게 수신한 과거 구매도 실제 구매 시간 순서로 사용하고 수량 배분 이력을 남긴다", async () => {
    const i = await intent();
    const older = verified(i);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const newer = verified(i);
    const recent = await store.grant(i.id, i.userId, newer, "encrypted");
    const old = await store.grant(i.id, i.userId, older, "encrypted");
    await wallets.spend("user-a", 12, "fifo");
    const allocations = (
      await pool.query(
        "SELECT purchase_id,quantity FROM payment_spend_allocation ORDER BY quantity DESC",
      )
    ).rows;
    expect(allocations).toEqual([
      { purchase_id: old.id, quantity: 10 },
      { purchase_id: recent.id, quantity: 2 },
    ]);
  });
  test("서명 검증과 현재 스토어 상태 확인을 마친 환불 취소는 미사용 간식을 한 번만 복구한다", async () => {
    const { p, purchase } = await topup();
    await store.refund({ ...p, state: "REFUNDED" });
    const reversed = { ...p, refundReversed: true };
    const restored = await Promise.all([
      store.restore(reversed, "encrypted"),
      store.restore(reversed, "encrypted"),
    ]);
    expect(
      restored.every((r) => r.id === purchase.id && r.state === "PURCHASED"),
    ).toBe(true);
    expect(await wallets.wallet("user-a")).toEqual({
      balance: 10,
      availableBalance: 10,
      frozen: false,
    });
    expect(
      (
        await pool.query(
          "SELECT count(*)::int n FROM payment_ledger WHERE kind='RESTORE'",
        )
      ).rows[0].n,
    ).toBe(1);
  });
  test("부분 사용 후 환불 취소는 회수한 잔여 수량만 복구하고 이미 사용한 수량은 돌려주지 않는다", async () => {
    const { p, purchase } = await topup();
    await wallets.spend("user-a", 3, "use-before-refund");
    await store.refund({ ...p, state: "REFUNDED" });
    expect((await wallets.wallet("user-a")).frozen).toBe(true);
    expect(
      await store.restore({ ...p, refundReversed: true }, "encrypted"),
    ).toMatchObject({ state: "PURCHASED", refundReview: false });
    expect(await wallets.wallet("user-a")).toEqual({
      balance: 7,
      availableBalance: 7,
      frozen: false,
    });
    await expect(
      store.requestRefund("user-a", purchase.id),
    ).rejects.toMatchObject({ code: "PURCHASE_ALREADY_USED" });
  });
  test("일반 구매 재확인이나 다른 스토어 증명으로 환불 내역을 취소할 수 없다", async () => {
    const { i, p } = await topup();
    await store.refund({ ...p, state: "REFUNDED" });
    await expect(store.restore(p, "encrypted")).rejects.toMatchObject({
      code: "INVALID_REFUND_REVERSAL",
    });
    await expect(
      store.restore(
        { ...p, provider: "GOOGLE", refundReversed: true },
        "encrypted",
      ),
    ).rejects.toMatchObject({ code: "INVALID_REFUND_REVERSAL" });
    expect((await store.grant(i.id, i.userId, p, "encrypted")).state).toBe(
      "REFUNDED",
    );
    expect((await wallets.wallet("user-a")).balance).toBe(0);
  });
  test("같은 구매가 여러 번 환불과 취소를 거쳐도 각 회수 수량만 복구한다", async () => {
    const { p } = await topup();
    await wallets.spend("user-a", 3, "use-cycle-1");
    await store.refund({ ...p, state: "REFUNDED" });
    await store.restore({ ...p, refundReversed: true }, "encrypted");
    await wallets.spend("user-a", 2, "use-cycle-2");
    await store.refund({ ...p, state: "REFUNDED" });
    await store.restore({ ...p, refundReversed: true }, "encrypted");
    expect(await wallets.wallet("user-a")).toEqual({
      balance: 5,
      availableBalance: 5,
      frozen: false,
    });
    const revisions = (
      await pool.query(
        "SELECT kind,delta FROM payment_ledger WHERE kind IN ('REFUND','RESTORE') ORDER BY created_at,id",
      )
    ).rows;
    expect(revisions).toEqual([
      { kind: "REFUND", delta: -7 },
      { kind: "RESTORE", delta: 7 },
      { kind: "REFUND", delta: -5 },
      { kind: "RESTORE", delta: 5 },
    ]);
  });
  test("다른 환불 검토 건이 남아 있으면 한 구매의 환불 취소만으로 지갑 보류를 해제하지 않는다", async () => {
    const first = await topup();
    const second = await topup();
    await wallets.spend("user-a", 13, "use-two-lots");
    await store.refund({ ...first.p, state: "REFUNDED" });
    await store.refund({ ...second.p, state: "REFUNDED" });
    await store.restore({ ...first.p, refundReversed: true }, "encrypted");
    expect((await wallets.wallet("user-a")).frozen).toBe(true);
    await store.restore({ ...second.p, refundReversed: true }, "encrypted");
    expect(await wallets.wallet("user-a")).toEqual({
      balance: 7,
      availableBalance: 7,
      frozen: false,
    });
  });
  test("충전 전에 환불과 취소가 도착하면 일치하는 기존 구매 준비에서 원자적으로 복구한다", async () => {
    const i = await intent();
    const p = verified(i);
    await store.refund({ ...p, state: "REFUNDED" });
    expect(
      (await store.restore({ ...p, refundReversed: true }, "encrypted")).state,
    ).toBe("PURCHASED");
    expect((await wallets.wallet("user-a")).balance).toBe(10);
    expect(
      (await pool.query("SELECT count(*)::int n FROM payment_refund_tombstone"))
        .rows[0].n,
    ).toBe(0);
  });
  test("매칭 계정이 없는 환불 취소는 선행 환불 차단 기록도 제거하지 않는다", async () => {
    const i = await intent();
    const p = verified(i, { accountToken: randomUUID() });
    await store.refund({ ...p, state: "REFUNDED" });
    await expect(
      store.restore({ ...p, refundReversed: true }, "encrypted"),
    ).rejects.toMatchObject({ code: "PURCHASE_INTENT_NOT_FOUND" });
    expect(
      (await pool.query("SELECT count(*)::int n FROM payment_refund_tombstone"))
        .rows[0].n,
    ).toBe(1);
  });
  test("환불 대조 시점은 재시작 후 유지하며 이전 날짜로 되돌아가지 않는다", async () => {
    expect(await store.reconciliationCursor("APPLE")).toBeNull();
    const current = new Date("2026-10-05T12:00:00Z");
    await store.saveReconciliationCursor("APPLE", current);
    await store.saveReconciliationCursor(
      "APPLE",
      new Date("2026-10-04T12:00:00Z"),
    );
    const restarted = new PostgresPaymentStore(pool, "Sandbox");
    expect(await restarted.reconciliationCursor("APPLE")).toEqual(current);
    expect(await restarted.reconciliationCursor("GOOGLE")).toBeNull();
  });
  test("동시 사용은 잔액을 초과할 수 없고 성공한 사용만 기록한다", async () => {
    await topup();
    const attempts = await Promise.allSettled([
      wallets.spend("user-a", 7, "one"),
      wallets.spend("user-a", 7, "two"),
    ]);
    expect(attempts.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await wallets.wallet("user-a")).balance).toBe(3);
  });
  test("사용 재시도는 한 번만 차감하며 참조를 다른 사용자나 수량에 재사용할 수 없다", async () => {
    await topup();
    await topup("user-b");
    await Promise.all([
      wallets.spend("user-a", 2, "shared-ref"),
      wallets.spend("user-a", 2, "shared-ref"),
    ]);
    expect((await wallets.wallet("user-a")).balance).toBe(8);
    await expect(
      wallets.spend("user-b", 2, "shared-ref"),
    ).rejects.toMatchObject({
      code: "SPEND_REFERENCE_MISMATCH",
    });
    await expect(
      wallets.spend("user-a", 3, "shared-ref"),
    ).rejects.toMatchObject({
      code: "SPEND_REFERENCE_MISMATCH",
    });
  });
  test("구매 이력은 사용자별 20건 단위로 중복 없이 다음 페이지를 조회한다", async () => {
    for (let n = 0; n < 22; n++) await topup();
    await topup("user-b");
    const first = await store.purchases("user-a");
    const second = await store.purchases("user-a", first.at(-1)?.id);
    expect(first).toHaveLength(20);
    expect(second).toHaveLength(2);
    expect(new Set([...first, ...second].map((p) => p.id)).size).toBe(22);
    expect([...first, ...second].every((p) => p.userId === "user-a")).toBe(
      true,
    );
  });
  test("내부 작업 기록 실패 시 구매·원장·지갑을 함께 되돌린다", async () => {
    const i = await intent();
    const p = verified(i);
    await pool.query(
      "INSERT INTO payment_job(id,kind,provider,dedupe_key,encrypted_proof) VALUES('00000000000000000000000000','FINALIZE','APPLE',$1,'encrypted')",
      [`Sandbox:${p.transactionId}`],
    );
    await expect(store.grant(i.id, i.userId, p, "encrypted")).rejects.toThrow();
    expect((await wallets.wallet(i.userId)).balance).toBe(0);
    expect(await store.purchases(i.userId)).toHaveLength(0);
    expect(
      (await pool.query("SELECT count(*)::int n FROM payment_ledger")).rows[0]
        .n,
    ).toBe(0);
  });
  test("알림 중복은 완료 후에도 억제하고 여러 작업자는 서로 다른 작업을 가져간다", async () => {
    await store.enqueueNotification("APPLE", "event-one", "cipher-one");
    await store.enqueueNotification("APPLE", "event-two", "cipher-two");
    const [a, b] = await Promise.all([store.claimJobs(1), store.claimJobs(1)]);
    expect(a[0].id).not.toBe(b[0].id);
    await store.completeJob(a[0].id, a[0].leaseToken);
    await store.completeJob(b[0].id, b[0].leaseToken);
    await store.enqueueNotification("APPLE", "event-one", "cipher-new");
    expect(await store.claimJobs(10)).toEqual([]);
  });
  test("만료된 작업자는 새 임대 작업을 완료하거나 재예약할 수 없다", async () => {
    await store.enqueueNotification("GOOGLE", "lease-event", "cipher");
    const [old] = await store.claimJobs(1);
    await pool.query(
      "UPDATE payment_job SET lease_until=now()-interval '1 second' WHERE id=$1",
      [old.id],
    );
    const [fresh] = await store.claimJobs(1);
    expect(fresh.attempts).toBe(2);
    expect(fresh.leaseToken).not.toBe(old.leaseToken);
    await store.completeJob(old.id, old.leaseToken);
    await store.failJob(old.id, old.leaseToken);
    expect(
      (
        await pool.query("SELECT lease_token FROM payment_job WHERE id=$1", [
          old.id,
        ])
      ).rows[0].lease_token,
    ).toBe(fresh.leaseToken);
    await store.failJob(fresh.id, fresh.leaseToken);
    expect(await store.claimJobs(1)).toEqual([]);
    await pool.query(
      "UPDATE payment_job SET next_attempt_at=now()-interval '1 second' WHERE id=$1",
      [fresh.id],
    );
    expect((await store.claimJobs(1))[0].attempts).toBe(3);
  });
});
