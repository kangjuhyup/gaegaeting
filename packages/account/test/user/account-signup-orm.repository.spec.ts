import { jest } from "@jest/globals";
import { AccountSignupOrmRepository } from "../../src/user/infrastructure/adapter/outbound/persistence/account-signup-orm.repository.js";

describe("Saved signup identity", () => {
  const identity = {
    name: "가입 이름",
    birthDate: new Date("1996-05-14T00:00:00Z"),
    gender: "FEMALE" as const,
    phone: "01012345678",
  };
  const verification = {
    provider: "mock",
    providerTransactionId: "mock-tx-1",
    verifiedAt: new Date("2026-10-03T00:00:00Z"),
  };
  const reservation = {
    diDigest: "d".repeat(64),
    username: "alice",
    issuer: "issuer",
    termsVersion: "v1",
    identity,
    verification,
  };

  test("signup stores personal information before provisioning and retries preserve it", async () => {
    let row: any = null;
    const em: any = {
      findOne: jest.fn(async () => row),
      create: jest.fn((_entity: unknown, value: unknown) => value),
      persist: jest.fn((value: unknown) => {
        row = value;
      }),
      flush: jest.fn(async () => {}),
      transactional: jest.fn(async (work: (em: any) => unknown) => work(em)),
    };
    const repository = new AccountSignupOrmRepository(em);
    await repository.reserve(reservation);
    expect(row).toMatchObject({ ...identity, status: "PENDING" });
    expect(row).toMatchObject({
      verificationProvider: verification.provider,
      providerTransactionId: verification.providerTransactionId,
      verifiedAt: verification.verifiedAt,
    });
    expect(row).not.toHaveProperty("ci");
    expect(row).not.toHaveProperty("di");
    await repository.reserve({
      ...reservation,
      verification: {
        ...verification,
        providerTransactionId: "retry-tx",
        verifiedAt: new Date("2026-10-04"),
      },
    });
    expect(em.persist).toHaveBeenCalledTimes(1);
    expect(row.providerTransactionId).toBe(verification.providerTransactionId);
    expect(row.verifiedAt).toBe(verification.verifiedAt);
    await expect(
      repository.reserve({
        ...reservation,
        identity: { ...identity, name: "다른 이름" },
      }),
    ).rejects.toThrow("cannot be changed");
    expect(row.name).toBe(identity.name);
    await expect(
      repository.reserve({ ...reservation, username: "another" }),
    ).rejects.toThrow("another account");
    await expect(
      repository.reserve({
        ...reservation,
        verification: { ...verification, provider: "another" },
      }),
    ).rejects.toThrow("provider cannot be changed");
  });

  test("기존 가입의 빈 인증 이력은 재시도로 추정해서 채우지 않는다", async () => {
    const row = {
      ...identity,
      username: "alice",
      authIssuer: "issuer",
      termsVersion: "v1",
      authSubject: "existing-subject",
    };
    const em = { findOne: jest.fn(async () => row) };
    const repository = new AccountSignupOrmRepository(em as never);
    await expect(repository.reserve(reservation)).resolves.toMatchObject({
      authSubject: "existing-subject",
    });
    expect(row).not.toHaveProperty("verificationProvider");
    expect(row).not.toHaveProperty("providerTransactionId");
    expect(row).not.toHaveProperty("verifiedAt");
  });

  test.each(["alice", "another"])(
    "동시 예약에서 DI unique 경쟁 이후 승리한 가입을 확인한다: %s",
    async (winner) => {
      const row = {
        ...identity,
        username: winner,
        authIssuer: "issuer",
        termsVersion: "v1",
        verificationProvider: "mock",
      };
      const em = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(row),
        transactional: jest.fn().mockRejectedValue({ code: "23505" }),
      };
      const repository = new AccountSignupOrmRepository(em as never);
      if (winner === "alice")
        await expect(repository.reserve(reservation)).resolves.toMatchObject({
          username: "alice",
        });
      else
        await expect(repository.reserve(reservation)).rejects.toThrow(
          "another account",
        );
    },
  );

  test("identity lookup is scoped to the signed-in user and a completed signup", async () => {
    const em = {
      findOne: jest.fn(async () => ({ ...identity, status: "COMPLETED" })),
    };
    const repository = new AccountSignupOrmRepository(em as any);
    await expect(repository.findIdentity("signed-in-user")).resolves.toEqual(
      identity,
    );
    expect(em.findOne).toHaveBeenCalledWith(expect.anything(), {
      userId: "signed-in-user",
      status: "COMPLETED",
    });
  });

  test("missing legacy identity does not become an example name or date of birth", async () => {
    const em = { findOne: jest.fn(async () => ({ status: "COMPLETED" })) };
    const repository = new AccountSignupOrmRepository(em as any);
    await expect(repository.findIdentity("legacy-user")).resolves.toBeNull();
  });

  test("카카오 가입은 비밀번호 가입과 같은 DI를 예약하지만 가짜 아이디를 저장하지 않는다", async () => {
    let row: any = null;
    const em: any = {
      findOne: jest.fn(async () => row),
      create: jest.fn((_entity: unknown, value: unknown) => value),
      persist: jest.fn((value: unknown) => {
        row = value;
      }),
      flush: jest.fn(async () => {}),
      transactional: jest.fn(async (work: (em: any) => unknown) => work(em)),
    };
    const repository = new AccountSignupOrmRepository(em);
    const social = {
      diDigest: reservation.diDigest,
      method: "SOCIAL" as const,
      externalIdentityDigest: "e".repeat(64),
      issuer: reservation.issuer,
      termsVersion: reservation.termsVersion,
      identity,
      verification,
    };
    await repository.reserve(social);
    expect(row).toMatchObject({
      signupMethod: "SOCIAL",
      externalIdentityDigest: social.externalIdentityDigest,
      status: "PENDING",
    });
    expect(row.username).toBeUndefined();
    await repository.reserve(social);
    expect(em.persist).toHaveBeenCalledTimes(1);
    await expect(repository.reserve(reservation)).rejects.toThrow(
      "another account",
    );
    await expect(
      repository.reserve({ ...social, externalIdentityDigest: "f".repeat(64) }),
    ).rejects.toThrow("IDENTITY_ALREADY_REGISTERED");
  });

  test("기존 비밀번호 가입의 DI를 카카오 가입으로 전환하지 않는다", async () => {
    const em = {
      findOne: jest.fn(async () => ({
        ...identity,
        signupMethod: "PASSWORD",
        username: "alice",
        authIssuer: reservation.issuer,
        termsVersion: reservation.termsVersion,
      })),
    };
    const repository = new AccountSignupOrmRepository(em as never);
    await expect(
      repository.reserve({
        ...reservation,
        username: undefined,
        method: "SOCIAL",
        externalIdentityDigest: "e".repeat(64),
      }),
    ).rejects.toThrow("IDENTITY_ALREADY_REGISTERED");
  });
});
