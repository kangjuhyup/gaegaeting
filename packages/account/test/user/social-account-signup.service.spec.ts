import { jest } from "@jest/globals";
import { ConflictException } from "@nestjs/common";
import { SocialAccountSignupService } from "../../src/user/application/service/social-account-signup.service.js";
import { AccountSignupService } from "../../src/user/application/service/account-signup.service.js";
import type { AccountSignupReservation } from "../../src/user/application/port/account-signup-repository.port.js";

describe("카카오 인증 후 서비스 회원가입", () => {
  const now = new Date("2026-10-05T00:00:00Z");
  const options = {
    authIssuer: "https://auth.example.test/t/gaegaeting/oidc",
    signupClientId: "gaegaeting-web",
    signupClientIds: ['gaegaeting-web', 'gaegaeting-mobile'],
    diHmacSecret: "s".repeat(32),
    diHmacKeyVersion: 1,
    handoffTtlMs: 600000,
    claimTtlMs: 300000,
    now: () => now,
  };
  const input = {
    ticket: "t".repeat(43),
    attemptId: "a".repeat(43),
    termsVersion: "v1",
    termsAgreed: true,
    name: "홍길동",
    birthDate: "1996-05-14",
    gender: "FEMALE" as const,
    phone: "010-1234-5678",
  };
  const claim = {
    ticketId: "ticket-1",
    provider: "kakao",
    providerSub: "123456789",
    clientId: options.signupClientId,
    issuer: options.authIssuer,
    expiresAt: new Date("2026-10-05T00:10:00Z"),
  };
  const verified = {
    ci: "transient-ci",
    di: "transient-di",
    adult: true,
    provider: "mock",
    providerTransactionId: "verification-1",
    verifiedAt: now,
    identity: {
      name: input.name,
      birthDate: input.birthDate,
      gender: input.gender,
      phone: "01012345678",
    },
  };
  function setup() {
    const verifier = { request: jest.fn(async () => verified) };
    const auth = {
      claim: jest.fn(async () => claim),
      complete: jest.fn(async (_value: unknown) => ({
        issuer: options.authIssuer,
        authSubject: "auth-user-1",
      })),
    };
    const signups = {
      reserve: jest.fn(async (_value: AccountSignupReservation) => ({
        userId: "user-1",
        issuer: options.authIssuer,
        authSubject: undefined as string | undefined,
      })),
      complete: jest.fn(async () => ({
        userId: "user-1",
        issuer: options.authIssuer,
        authSubject: "auth-user-1",
      })),
    };
    const service = new SocialAccountSignupService(
      verifier as never,
      auth as never,
      signups as never,
      options,
    );
    return { service, auth, verifier, signups };
  }

  test('native signup uses the approved selector bound to the verified Auth ticket', async () => {
    const { service, auth } = setup();
    auth.claim.mockResolvedValue({ ...claim, clientId: 'gaegaeting-mobile' });
    await expect(service.register({ ...input, clientId: 'gaegaeting-mobile' })).resolves.toEqual({ authSubject: 'auth-user-1' });
    expect(auth.claim).toHaveBeenCalledWith({ ticket: input.ticket, attemptId: input.attemptId, clientId: 'gaegaeting-mobile' });
    expect(auth.complete).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'gaegaeting-mobile' }));
  });
  test.each(['gaegaeting-admin-web', 'vote-web', 'gaegaeting-mobile-dev', 'unknown-client'])(
    'unapproved client %s cannot reach Auth, identity verification or persistence', async clientId => {
      const { service, auth, verifier, signups } = setup();
      await expect(service.register({ ...input, clientId })).rejects.toThrow('SOCIAL_SIGNUP_INVALID');
      expect(auth.claim).not.toHaveBeenCalled();
      expect(verifier.request).not.toHaveBeenCalled();
      expect(signups.reserve).not.toHaveBeenCalled();
    });
  test('approved native selector cannot override a ticket verified for the web client', async () => {
    const { service, auth, verifier, signups } = setup();
    await expect(service.register({ ...input, clientId: 'gaegaeting-mobile' })).rejects.toThrow('SOCIAL_SIGNUP_INVALID');
    expect(verifier.request).not.toHaveBeenCalled();
    expect(signups.reserve).not.toHaveBeenCalled();
    expect(auth.complete).not.toHaveBeenCalled();
  });

  test("Auth 인증 확인과 DI 예약이 끝난 뒤 비밀번호 없는 계정을 만들고 서비스 회원을 연결한다", async () => {
    const { service, auth, verifier, signups } = setup();
    await expect(service.register(input)).resolves.toEqual({
      authSubject: "auth-user-1",
    });
    expect(auth.claim).toHaveBeenCalledWith({
      ticket: input.ticket,
      attemptId: input.attemptId,
      clientId: options.signupClientId,
    });
    expect(verifier.request).toHaveBeenCalledWith(verified.identity);
    expect(signups.reserve).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "SOCIAL",
        diDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
        externalIdentityDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
        identity: {
          ...verified.identity,
          birthDate: new Date("1996-05-14T00:00:00Z"),
        },
      }),
    );
    const saved = JSON.stringify(signups.reserve.mock.calls);
    for (const secret of [
      verified.ci,
      verified.di,
      claim.providerSub,
      input.ticket,
      input.attemptId,
    ])
      expect(saved).not.toContain(secret);
    expect(signups.reserve.mock.calls[0][0]).not.toHaveProperty("username");
    expect(auth.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        ticket: input.ticket,
        attemptId: input.attemptId,
        clientId: options.signupClientId,
        idempotencyKey: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      }),
    );
    const writes = JSON.stringify(auth.complete.mock.calls);
    for (const field of [
      "password",
      "username",
      "ci",
      "di",
      "phone",
      "birthDate",
    ])
      expect(writes).not.toContain(`\"${field}\"`);
    expect(auth.claim.mock.invocationCallOrder[0]).toBeLessThan(
      verifier.request.mock.invocationCallOrder[0],
    );
    expect(signups.reserve.mock.invocationCallOrder[0]).toBeLessThan(
      auth.complete.mock.invocationCallOrder[0],
    );
    expect(auth.complete.mock.invocationCallOrder[0]).toBeLessThan(
      signups.complete.mock.invocationCallOrder[0],
    );
  });

  test("비밀번호 가입과 카카오 가입은 동일한 DI HMAC으로 중복 확인한다", async () => {
    const { service, verifier, signups } = setup();
    const password = new AccountSignupService(
      verifier as never,
      { provision: async () => ({ authSubject: "password-user" }) },
      signups as never,
      options,
    );
    await password.register({
      ...input,
      username: "alice",
      password: "password123",
      email: "alice@example.test",
    });
    await service.register(input);
    expect(signups.reserve.mock.calls[0][0].diDigest).toBe(
      signups.reserve.mock.calls[1][0].diDigest,
    );
  });

  test("이미 다른 가입 수단에 등록된 DI면 신규 Auth 사용자를 생성하지 않는다", async () => {
    const { service, auth, signups } = setup();
    signups.reserve.mockRejectedValueOnce(
      new ConflictException("IDENTITY_ALREADY_REGISTERED"),
    );
    await expect(service.register(input)).rejects.toThrow(
      "IDENTITY_ALREADY_REGISTERED",
    );
    expect(auth.complete).not.toHaveBeenCalled();
    expect(signups.complete).not.toHaveBeenCalled();
  });

  test.each([
    { issuer: "https://other.example.test" },
    { clientId: "other-client" },
    { provider: "google" },
    { providerSub: "undefined" },
    { expiresAt: now },
    { expiresAt: new Date("invalid") },
  ])(
    "다른 서비스 또는 유효하지 않은 카카오 인증으로는 회원을 예약하지 않는다: %j",
    async (patch) => {
      const { service, auth, verifier, signups } = setup();
      auth.claim.mockResolvedValueOnce({ ...claim, ...patch });
      await expect(service.register(input)).rejects.toThrow(
        /SOCIAL_SIGNUP_(INVALID|EXPIRED)/,
      );
      expect(verifier.request).not.toHaveBeenCalled();
      expect(signups.reserve).not.toHaveBeenCalled();
      expect(auth.complete).not.toHaveBeenCalled();
    },
  );

  test.each([
    { termsAgreed: false },
    { termsVersion: "" },
    { name: "" },
    { birthDate: "1996-02-31" },
    { ticket: "" },
    { attemptId: "" },
  ])("잘못된 가입 요청은 인증 서비스에 보내지 않는다: %j", async (patch) => {
    const { service, auth } = setup();
    await expect(service.register({ ...input, ...patch })).rejects.toThrow();
    expect(auth.claim).not.toHaveBeenCalled();
  });

  test("미성년 인증 결과는 Auth 사용자 생성 전에 거절한다", async () => {
    const { service, verifier, auth, signups } = setup();
    verifier.request.mockResolvedValueOnce({ ...verified, adult: false });
    await expect(service.register(input)).rejects.toThrow("Adult verification");
    expect(signups.reserve).not.toHaveBeenCalled();
    expect(auth.complete).not.toHaveBeenCalled();
  });

  test.each(["Auth 완료 실패", "Account 연결 실패"])(
    "%s 후 새 티켓으로도 같은 예약과 멱등 키를 사용해 복구한다",
    async (failure) => {
      const { service, auth, signups } = setup();
      if (failure === "Auth 완료 실패")
        auth.complete.mockRejectedValueOnce(
          new Error("SOCIAL_SIGNUP_UNAVAILABLE"),
        );
      else
        signups.complete.mockRejectedValueOnce(
          new Error("DATABASE_UNAVAILABLE"),
        );
      await expect(service.register(input)).rejects.toThrow("UNAVAILABLE");
      auth.claim.mockResolvedValueOnce({ ...claim, ticketId: "new-ticket" });
      await expect(
        service.register({
          ...input,
          ticket: "n".repeat(43),
          attemptId: "b".repeat(43),
        }),
      ).resolves.toEqual({ authSubject: "auth-user-1" });
      expect(signups.reserve.mock.calls[1][0]).toEqual(
        signups.reserve.mock.calls[0][0],
      );
      const completions = auth.complete.mock.calls.map(
        (call) => call[0] as { idempotencyKey: string },
      );
      expect(completions[1].idempotencyKey).toBe(completions[0].idempotencyKey);
    },
  );

  test("이미 완료된 회원도 새 티켓을 같은 Auth subject에 결합해 로그인 재개가 가능하게 한다", async () => {
    const { service, auth, signups } = setup();
    signups.reserve.mockResolvedValueOnce({
      userId: "user-1",
      issuer: options.authIssuer,
      authSubject: "auth-user-1",
    });
    await expect(service.register(input)).resolves.toEqual({
      authSubject: "auth-user-1",
    });
    expect(auth.complete).toHaveBeenCalledTimes(1);
  });

  test("Auth가 기존 예약과 다른 사용자나 issuer를 반환하면 회원 연결을 변경하지 않는다", async () => {
    const { service, auth, signups } = setup();
    signups.reserve.mockResolvedValueOnce({
      userId: "user-1",
      issuer: options.authIssuer,
      authSubject: "existing-user",
    });
    await expect(service.register(input)).rejects.toThrow(
      "SOCIAL_SIGNUP_INVALID",
    );
    expect(signups.complete).not.toHaveBeenCalled();
    auth.complete.mockResolvedValueOnce({
      issuer: "other-issuer",
      authSubject: "auth-user-1",
    });
    await expect(service.register(input)).rejects.toThrow(
      "SOCIAL_SIGNUP_INVALID",
    );
    expect(signups.complete).not.toHaveBeenCalled();
  });
});
