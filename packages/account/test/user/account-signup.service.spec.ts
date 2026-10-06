import { jest } from "@jest/globals";
import {
  AccountSignupService,
  type RegisterAccountInput,
} from "../../src/user/application/service/account-signup.service.js";
import type {
  IdentityVerificationRequest,
  SignupIdentityVerificationResult,
} from "../../src/user/application/port/identity-verification.port.js";
import type { AccountSignupReservation } from "../../src/user/application/port/account-signup-repository.port.js";
import type { ProvisionAuthAccountInput } from "../../src/user/application/port/auth-account-provisioning.port.js";

describe("본인인증 기반 회원가입", () => {
  const input: RegisterAccountInput = {
    termsVersion: "2026-09-01",
    termsAgreed: true,
    username: "alice",
    password: "password123",
    email: "alice@example.com",
    phone: "01012345678",
    name: "홍길동",
    birthDate: "1996-05-14",
    gender: "FEMALE",
  };
  const verified: SignupIdentityVerificationResult = {
    provider: "mock",
    providerTransactionId: "mock-tx-1",
    ci: "private-ci",
    di: "private-di",
    adult: true,
    verifiedAt: new Date("2026-10-03T00:00:00Z"),
    identity: {
      name: input.name,
      birthDate: input.birthDate,
      gender: input.gender,
      phone: input.phone,
    },
  };
  const record = { userId: "user-1", username: "alice", issuer: "issuer" };

  function setup(result = verified) {
    const verifier = {
      request: jest.fn(async (_request: IdentityVerificationRequest) => result),
    };
    const authAccounts = {
      provision: jest.fn(async (_credentials: ProvisionAuthAccountInput) => ({
        authSubject: "auth-subject",
      })),
    };
    const signups = {
      reserve: jest.fn(async (_reservation: AccountSignupReservation) => ({
        ...record,
        authSubject: undefined as string | undefined,
      })),
      complete: jest.fn(
        async (_completion: { diDigest: string; subject: string }) => ({
          ...record,
          authSubject: "auth-subject",
        }),
      ),
    };
    const service = new AccountSignupService(
      verifier as never,
      authAccounts as never,
      signups as never,
      {
        diHmacSecret: "s".repeat(32),
        diHmacKeyVersion: 1,
        handoffTtlMs: 600000,
        claimTtlMs: 300000,
        authIssuer: "issuer",
        now: () => new Date("2026-10-03T00:00:00Z"),
      },
    );
    return { service, verifier, authAccounts, signups };
  }

  test("서버가 본인인증을 요청하고 확인된 정보만 저장하며 Auth에는 로그인 정보만 전달한다", async () => {
    const { service, verifier, authAccounts, signups } = setup();
    const untrusted = {
      ...input,
      ci: "client-ci",
      di: "client-di",
      adult: true,
      providerTransactionId: "client-tx",
    };
    await expect(service.register(untrusted)).resolves.toEqual({
      authSubject: "auth-subject",
    });
    expect(verifier.request).toHaveBeenCalledWith(verified.identity);
    expect(signups.reserve).toHaveBeenCalledWith({
      diDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
      username: "alice",
      issuer: "issuer",
      termsVersion: input.termsVersion,
      identity: {
        ...verified.identity,
        birthDate: new Date("1996-05-14T00:00:00Z"),
      },
      verification: {
        provider: "mock",
        providerTransactionId: "mock-tx-1",
        verifiedAt: verified.verifiedAt,
      },
    });
    expect(authAccounts.provision).toHaveBeenCalledWith({
      username: "alice",
      password: input.password,
      idempotencyKey: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
    });
    const downstream = JSON.stringify([
      signups.reserve.mock.calls,
      signups.complete.mock.calls,
      authAccounts.provision.mock.calls,
    ]);
    for (const sensitive of [
      "private-ci",
      "private-di",
      "client-ci",
      "client-di",
      input.email,
    ])
      expect(downstream).not.toContain(sensitive);
    expect(verifier.request.mock.invocationCallOrder[0]).toBeLessThan(
      signups.reserve.mock.invocationCallOrder[0],
    );
    expect(signups.reserve.mock.invocationCallOrder[0]).toBeLessThan(
      authAccounts.provision.mock.invocationCallOrder[0],
    );
    expect(authAccounts.provision.mock.invocationCallOrder[0]).toBeLessThan(
      signups.complete.mock.invocationCallOrder[0],
    );
  });

  test("사용자가 보낸 인적 정보 대신 인증기관이 확인한 인적 정보를 저장한다", async () => {
    const confirmed = {
      ...verified,
      identity: {
        ...verified.identity,
        name: "확인된 이름",
        birthDate: "1990-01-01",
      },
    };
    const { service, signups } = setup(confirmed);
    await service.register(input);
    expect(signups.reserve.mock.calls[0][0].identity).toEqual({
      ...confirmed.identity,
      birthDate: new Date("1990-01-01T00:00:00Z"),
    });
  });

  test.each([
    { name: "" },
    { birthDate: "1996-02-31" },
    { birthDate: "not-a-date" },
    { gender: undefined },
    { phone: "not-a-phone" },
    { termsAgreed: false },
    { termsVersion: " " },
    { password: "short" },
    { username: "!" },
  ])(
    "잘못된 가입 입력은 본인인증 요청과 가입 예약 전에 거절한다: %j",
    async (patch) => {
      const { service, verifier, signups, authAccounts } = setup();
      await expect(service.register({ ...input, ...patch })).rejects.toThrow();
      expect(verifier.request).not.toHaveBeenCalled();
      expect(signups.reserve).not.toHaveBeenCalled();
      expect(authAccounts.provision).not.toHaveBeenCalled();
    },
  );

  test("본인인증 요청이 실패하면 저장하거나 Auth 계정을 만들지 않는다", async () => {
    const { service, verifier, signups, authAccounts } = setup();
    verifier.request.mockRejectedValueOnce(
      new Error("IDENTITY_VERIFICATION_UNAVAILABLE"),
    );
    await expect(service.register(input)).rejects.toThrow(
      "IDENTITY_VERIFICATION_UNAVAILABLE",
    );
    expect(signups.reserve).not.toHaveBeenCalled();
    expect(authAccounts.provision).not.toHaveBeenCalled();
  });

  test.each([
    { adult: false },
    { di: "" },
    { provider: "" },
    { providerTransactionId: "" },
    { verifiedAt: new Date("invalid") },
    { identity: { ...verified.identity, birthDate: "2020-01-01" } },
    { identity: { ...verified.identity, birthDate: "1996-02-31" } },
  ])(
    "미성년 또는 불완전한 인증 결과로는 가입하지 않는다: %j",
    async (patch) => {
      const { service, signups, authAccounts } = setup({
        ...verified,
        ...patch,
      });
      await expect(service.register(input)).rejects.toThrow();
      expect(signups.reserve).not.toHaveBeenCalled();
      expect(authAccounts.provision).not.toHaveBeenCalled();
    },
  );

  test.each(["2008-10-03", "2008-10-04"])(
    "만 18세 생일을 기준으로 가입 가능 여부를 판단한다: %s",
    async (birthDate) => {
      const { service } = setup({
        ...verified,
        identity: { ...verified.identity, birthDate },
      });
      if (birthDate === "2008-10-03")
        await expect(service.register(input)).resolves.toEqual({
          authSubject: "auth-subject",
        });
      else
        await expect(service.register(input)).rejects.toThrow(
          "Adult verification",
        );
    },
  );

  test("이미 가입이 완료됐으면 기존 subject를 반환하고 Auth 계정을 다시 만들지 않는다", async () => {
    const { service, signups, authAccounts } = setup();
    signups.reserve.mockResolvedValueOnce({
      ...record,
      authSubject: "existing-subject",
    });
    await expect(service.register(input)).resolves.toEqual({
      authSubject: "existing-subject",
    });
    expect(authAccounts.provision).not.toHaveBeenCalled();
    expect(signups.complete).not.toHaveBeenCalled();
  });

  test("동일 신원으로 다른 계정을 예약할 수 없으면 Auth 요청도 하지 않는다", async () => {
    const { service, signups, authAccounts } = setup();
    signups.reserve.mockRejectedValueOnce(
      new Error("Identity is already registered with another account"),
    );
    await expect(service.register(input)).rejects.toThrow("already registered");
    expect(authAccounts.provision).not.toHaveBeenCalled();
  });

  test.each(["Auth 실패", "Auth 성공 후 DB 완료 실패"])(
    "%s 이후 동일 DI와 멱등 키로 가입을 재개한다",
    async (failure) => {
      const { service, verifier, signups, authAccounts } = setup();
      if (failure === "Auth 실패")
        authAccounts.provision.mockRejectedValueOnce(
          new Error("AUTH_PROVISIONING_UNAVAILABLE"),
        );
      else
        signups.complete.mockRejectedValueOnce(
          new Error("DATABASE_UNAVAILABLE"),
        );
      await expect(service.register(input)).rejects.toThrow("UNAVAILABLE");
      verifier.request.mockResolvedValueOnce({
        ...verified,
        providerTransactionId: "retry-tx",
      });
      await expect(service.register(input)).resolves.toEqual({
        authSubject: "auth-subject",
      });
      expect(authAccounts.provision.mock.calls[1][0]).toEqual(
        authAccounts.provision.mock.calls[0][0],
      );
      expect(signups.reserve.mock.calls[1][0].diDigest).toBe(
        signups.reserve.mock.calls[0][0].diDigest,
      );
    },
  );
});
