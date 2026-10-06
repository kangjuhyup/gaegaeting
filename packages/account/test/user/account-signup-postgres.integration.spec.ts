import { randomUUID } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { jest } from "@jest/globals";
import {
  MikroORM,
  AccountSignupOrmEntity,
  ExternalUserSubjectOrmEntity,
  buildMikroPostgresOptions,
} from "@core/database/mikro";
import { accountSignupMigration } from "../../src/migrations/account-signup.migration.js";
import { accountSignupConsentMigration } from "../../src/migrations/account-signup-consent.migration.js";
import { accountSignupIdentityMigration } from "../../src/migrations/account-signup-identity.migration.js";
import { accountSignupVerificationMigration } from "../../src/migrations/account-signup-verification.migration.js";
import { accountSocialSignupMigration } from "../../src/migrations/account-social-signup.migration.js";
import { initialAccountSchema } from "../../src/migrations/0001-account-schema.js";
import { AccountSignupOrmRepository } from "../../src/user/infrastructure/adapter/outbound/persistence/account-signup-orm.repository.js";
import { AccountSignupService } from "../../src/user/application/service/account-signup.service.js";
import { MockIdentityVerificationAdapter } from "../../src/user/infrastructure/adapter/outbound/identity/mock-identity-verification.adapter.js";
import type { ProvisionAuthAccountInput } from "../../src/user/application/port/auth-account-provisioning.port.js";
import { SocialAccountSignupService } from "../../src/user/application/service/social-account-signup.service.js";
import type { ExternalSignupAttempt } from "../../src/user/application/port/auth-external-signup.port.js";

const databaseUrl = process.env.ACCOUNT_TEST_DATABASE_URL;
const postgresSuite = databaseUrl ? describe : describe.skip;

postgresSuite("PostgreSQL 가입 중복·재시도·인증 이력", () => {
  const schema = `signup_test_${randomUUID().replaceAll("-", "")}`;
  const qualify = (sql: string) =>
    sql
      .replaceAll('"account_signup"', `"${schema}"."account_signup"`)
      .replaceAll(
        '"external_user_subject"',
        `"${schema}"."external_user_subject"`,
      );
  const input = {
    username: "alice",
    password: "password123",
    email: "alice@example.com",
    termsVersion: "v1",
    termsAgreed: true,
    name: "홍길동",
    birthDate: "1996-05-14",
    gender: "FEMALE" as const,
    phone: "01012345678",
  };
  let orm: MikroORM;
  let migratedLegacy: Record<string, unknown>;
  const options = {
    authIssuer: "issuer",
    signupClientId: "gaegaeting-web",
    diHmacSecret: "s".repeat(32),
    diHmacKeyVersion: 1,
    handoffTtlMs: 600000,
    claimTtlMs: 300000,
  };
  const verifier = new MockIdentityVerificationAdapter(
    new ConfigService({
      NODE_ENV: "test",
      REGISTRATION_MOCK_ENABLED: true,
      REGISTRATION_DI_HMAC_SECRET: options.diHmacSecret,
    }),
  );

  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    const config = new ConfigService({
      DATABASE_HOST: url.hostname,
      DATABASE_PORT: Number(url.port || 5432),
      DATABASE_USERNAME: decodeURIComponent(url.username),
      DATABASE_PASSWORD: decodeURIComponent(url.password),
      DATABASE_NAME: url.pathname.slice(1),
      DATABASE_LOG: false,
    });
    orm = await MikroORM.init({
      ...buildMikroPostgresOptions(config, [
        AccountSignupOrmEntity,
        ExternalUserSubjectOrmEntity,
      ]),
      schema,
    });
    const connection = orm.em.getConnection();
    await connection.execute(`CREATE SCHEMA "${schema}"`);
    for (const migration of [
      accountSignupMigration,
      accountSignupConsentMigration,
      accountSignupIdentityMigration,
    ]) {
      for (const statement of migration.statements)
        await connection.execute(qualify(statement.text));
    }
    await connection.execute(
      qualify(`INSERT INTO "account_signup" (id, user_id, di_digest, username, auth_issuer, status, terms_version, terms_agreed_at)
      VALUES (?, ?, ?, 'legacy', 'issuer', 'COMPLETED', 'v1', now())`),
      ["L".repeat(26), "U".repeat(26), "d".repeat(64)],
    );
    for (const statement of accountSignupVerificationMigration.statements)
      await connection.execute(qualify(statement.text));
    for (const statement of accountSocialSignupMigration.statements)
      await connection.execute(qualify(statement.text));
    [migratedLegacy] = await connection.execute(
      qualify('SELECT * FROM "account_signup" WHERE username = ?'),
      ["legacy"],
    );
    const externalTable = initialAccountSchema.statements.find((statement) =>
      statement.text.startsWith('CREATE TABLE "external_user_subject"'),
    )!;
    await connection.execute(qualify(externalTable.text));
    await connection.execute(qualify('DELETE FROM "account_signup"'));
  });

  afterEach(async () => {
    if (orm)
      await orm.em
        .getConnection()
        .execute(
          qualify('TRUNCATE TABLE "account_signup", "external_user_subject"'),
        );
  });

  afterAll(async () => {
    if (!orm) return;
    try {
      await orm.em
        .getConnection()
        .execute(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await orm.close(true);
    }
  });

  function service(
    provision: (
      credentials: ProvisionAuthAccountInput,
    ) => Promise<{ authSubject: string }>,
  ) {
    return new AccountSignupService(
      verifier,
      { provision },
      new AccountSignupOrmRepository(orm.em.fork()),
      options,
    );
  }

  test("기존 가입을 보존하고 CI·DI 원문 열 없이 인증 이력을 추가한다", async () => {
    expect(migratedLegacy).toMatchObject({
      username: "legacy",
      status: "COMPLETED",
      verification_provider: null,
      provider_transaction_id: null,
      verified_at: null,
    });
    const columns = await orm.em
      .getConnection()
      .execute(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ?",
        [schema, "account_signup"],
      );
    const names = columns.map(
      (column: { column_name: string }) => column.column_name,
    );
    expect(names).not.toContain("ci");
    expect(names).not.toContain("di");
    await expect(
      orm.em.getConnection().execute(
        qualify(`INSERT INTO "account_signup" (id, user_id, di_digest, username, auth_issuer, status, terms_version, terms_agreed_at, verification_provider)
      VALUES (?, ?, ?, 'incomplete', 'issuer', 'PENDING', 'v1', now(), 'mock')`),
        ["I".repeat(26), "U".repeat(26), "d".repeat(64)],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });

  test("같은 신원의 동시 가입 요청은 회원·Auth 연결을 하나만 생성한다", async () => {
    let release!: () => void;
    let arrivals = 0;
    const bothReady = new Promise<void>((resolve) => {
      release = resolve;
    });
    const provision = jest.fn(
      async (_credentials: ProvisionAuthAccountInput) => {
        if (++arrivals === 2) release();
        await bothReady;
        return { authSubject: "same-auth-subject" };
      },
    );
    const results = await Promise.all([
      service(provision).register(input),
      service(provision).register(input),
    ]);
    expect(results).toEqual([
      { authSubject: "same-auth-subject" },
      { authSubject: "same-auth-subject" },
    ]);
    expect(await orm.em.fork().count(AccountSignupOrmEntity, {})).toBe(1);
    expect(await orm.em.fork().count(ExternalUserSubjectOrmEntity, {})).toBe(1);
  });

  test("같은 신원으로 다른 아이디를 동시에 가입하면 한 요청만 완료된다", async () => {
    const provision = jest.fn(
      async (_credentials: ProvisionAuthAccountInput) => ({
        authSubject: "winner-subject",
      }),
    );
    const results = await Promise.allSettled([
      service(provision).register(input),
      service(provision).register({ ...input, username: "bob" }),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(provision).toHaveBeenCalledTimes(1);
    expect(
      await orm.em
        .fork()
        .count(AccountSignupOrmEntity, { status: "COMPLETED" }),
    ).toBe(1);
  });

  test("Auth 실패 후 재시도는 최초 인증 이력과 회원 ID를 보존하고 가입을 완료한다", async () => {
    const failed = jest.fn(
      async (
        _credentials: ProvisionAuthAccountInput,
      ): Promise<{ authSubject: string }> => {
        throw new Error("AUTH_UNAVAILABLE");
      },
    );
    await expect(service(failed).register(input)).rejects.toThrow(
      "AUTH_UNAVAILABLE",
    );
    const pending = await orm.em
      .fork()
      .findOneOrFail(AccountSignupOrmEntity, { username: "alice" });
    expect(pending.status).toBe("PENDING");
    expect(pending).not.toHaveProperty("ci");
    expect(pending).not.toHaveProperty("di");
    const provision = jest.fn(
      async (_credentials: ProvisionAuthAccountInput) => ({
        authSubject: "retry-subject",
      }),
    );
    await service(provision).register({ ...input, phone: "010-1234-5678" });
    const completed = await orm.em
      .fork()
      .findOneOrFail(AccountSignupOrmEntity, { username: "alice" });
    expect(completed).toMatchObject({
      status: "COMPLETED",
      id: pending.id,
      userId: pending.userId,
      providerTransactionId: pending.providerTransactionId,
      verifiedAt: pending.verifiedAt,
    });
    expect(provision.mock.calls[0][0].idempotencyKey).toBe(
      failed.mock.calls[0][0].idempotencyKey,
    );
  });

  const socialInput = {
    termsVersion: input.termsVersion,
    termsAgreed: true,
    name: input.name,
    birthDate: input.birthDate,
    gender: input.gender,
    phone: input.phone,
    ticket: "t".repeat(43),
    attemptId: "a".repeat(43),
  };
  function socialService(
    complete = jest.fn(
      async (_attempt: ExternalSignupAttempt & { idempotencyKey: string }) => ({
        issuer: "issuer",
        authSubject: "kakao-auth-user",
      }),
    ),
    providerSub = "123456789",
  ) {
    return {
      complete,
      signup: new SocialAccountSignupService(
        verifier,
        {
          claim: async () => ({
            ticketId: "ticket-1",
            provider: "kakao",
            providerSub,
            clientId: options.signupClientId,
            issuer: "issuer",
            expiresAt: new Date(Date.now() + 600000),
          }),
          complete,
        },
        new AccountSignupOrmRepository(orm.em.fork()),
        options,
      ),
    };
  }

  test("기존 가입을 보존하면서 아이디 없는 소셜 가입을 명시적으로 지원한다", async () => {
    expect(migratedLegacy.signup_method).toBe("PASSWORD");
    expect(migratedLegacy.username).toBe("legacy");
    expect(migratedLegacy.external_identity_digest).toBeNull();
    const { signup } = socialService();
    await signup.register(socialInput);
    const row = await orm.em
      .fork()
      .findOneOrFail(AccountSignupOrmEntity, { signupMethod: "SOCIAL" });
    expect(row.username).toBeNull();
    expect(row.externalIdentityDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(row).not.toHaveProperty("providerSub");
    expect(row).not.toHaveProperty("ci");
    expect(row).not.toHaveProperty("di");
    const connection = orm.em.getConnection();
    const columns = await connection.execute(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ?",
      [schema, "account_signup"],
    );
    expect(
      columns.map((row: { column_name: string }) => row.column_name),
    ).not.toEqual(expect.arrayContaining(["ci", "di", "provider_sub"]));
    await expect(
      connection.execute(
        qualify(
          `INSERT INTO "account_signup" (id,user_id,di_digest,auth_issuer,status,terms_version,terms_agreed_at,signup_method) VALUES (?,?,?,'issuer','PENDING','v1',now(),'SOCIAL')`,
        ),
        ["X".repeat(26), "Y".repeat(26), "x".repeat(64)],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });

  test.each(["비밀번호 먼저", "카카오 먼저"])(
    "가입 수단이 달라도 같은 DI는 회원을 추가 생성할 수 없다: %s",
    async (first) => {
      const { signup, complete } = socialService();
      const provision = jest.fn(async (_input: ProvisionAuthAccountInput) => ({
        authSubject: "password-auth-user",
      }));
      if (first === "비밀번호 먼저") {
        await service(provision).register(input);
        await expect(signup.register(socialInput)).rejects.toThrow(
          "IDENTITY_ALREADY_REGISTERED",
        );
        expect(complete).not.toHaveBeenCalled();
      } else {
        await signup.register(socialInput);
        await expect(service(provision).register(input)).rejects.toThrow(
          "another account",
        );
        expect(provision).not.toHaveBeenCalled();
      }
      expect(await orm.em.fork().count(AccountSignupOrmEntity, {})).toBe(1);
      expect(await orm.em.fork().count(ExternalUserSubjectOrmEntity, {})).toBe(
        1,
      );
    },
  );

  test("카카오 동시 가입은 회원과 Auth subject 연결을 하나만 만든다", async () => {
    const complete = jest.fn(
      async (_attempt: ExternalSignupAttempt & { idempotencyKey: string }) => ({
        issuer: "issuer",
        authSubject: "kakao-auth-user",
      }),
    );
    const results = await Promise.all([
      socialService(complete).signup.register(socialInput),
      socialService(complete).signup.register(socialInput),
    ]);
    expect(results).toEqual([
      { authSubject: "kakao-auth-user" },
      { authSubject: "kakao-auth-user" },
    ]);
    expect(await orm.em.fork().count(AccountSignupOrmEntity, {})).toBe(1);
    expect(await orm.em.fork().count(ExternalUserSubjectOrmEntity, {})).toBe(1);
    expect(complete.mock.calls[0][0].idempotencyKey).toBe(
      complete.mock.calls[1][0].idempotencyKey,
    );
  });

  test("같은 DI에 다른 카카오 계정이 동시에 요청하면 승리한 가입만 Auth 생성으로 진행한다", async () => {
    const complete = jest.fn(
      async (_attempt: ExternalSignupAttempt & { idempotencyKey: string }) => ({
        issuer: "issuer",
        authSubject: "kakao-auth-user",
      }),
    );
    const results = await Promise.allSettled([
      socialService(complete, "123").signup.register(socialInput),
      socialService(complete, "456").signup.register(socialInput),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  test("이미 등록된 카카오 인증으로 다른 DI를 등록하면 Auth 요청 전에 차단한다", async () => {
    const { signup, complete } = socialService();
    await signup.register(socialInput);
    await expect(
      socialService(complete).signup.register({
        ...socialInput,
        phone: "01099999999",
      }),
    ).rejects.toThrow("IDENTITY_ALREADY_REGISTERED");
    expect(complete).toHaveBeenCalledTimes(1);
    expect(await orm.em.fork().count(AccountSignupOrmEntity, {})).toBe(1);
  });

  test("Auth 완료 후 연결 DB가 실패해도 새 티켓으로 최초 예약과 subject를 복구한다", async () => {
    const { complete } = socialService();
    const repository = new AccountSignupOrmRepository(orm.em.fork());
    const broken = new SocialAccountSignupService(
      verifier,
      {
        claim: async () => ({
          ticketId: "ticket-1",
          provider: "kakao",
          providerSub: "123456789",
          clientId: options.signupClientId,
          issuer: "issuer",
          expiresAt: new Date(Date.now() + 600000),
        }),
        complete,
      },
      {
        reserve: (value) => repository.reserve(value),
        complete: async () => {
          throw new Error("DATABASE_UNAVAILABLE");
        },
        findIdentity: (userId) => repository.findIdentity(userId),
      },
      options,
    );
    await expect(broken.register(socialInput)).rejects.toThrow(
      "DATABASE_UNAVAILABLE",
    );
    const pending = await orm.em
      .fork()
      .findOneOrFail(AccountSignupOrmEntity, { signupMethod: "SOCIAL" });
    await socialService(complete).signup.register({
      ...socialInput,
      ticket: "n".repeat(43),
      attemptId: "b".repeat(43),
    });
    const completed = await orm.em
      .fork()
      .findOneOrFail(AccountSignupOrmEntity, { signupMethod: "SOCIAL" });
    expect(completed).toMatchObject({
      id: pending.id,
      userId: pending.userId,
      providerTransactionId: pending.providerTransactionId,
      status: "COMPLETED",
      authSubject: "kakao-auth-user",
    });
    expect(complete.mock.calls[0][0].idempotencyKey).toBe(
      complete.mock.calls[1][0].idempotencyKey,
    );
  });
});
