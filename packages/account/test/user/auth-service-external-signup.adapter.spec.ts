import { jest } from "@jest/globals";
import { AuthServiceExternalSignupAdapter } from "../../src/user/infrastructure/adapter/outbound/auth/auth-service-external-signup.adapter.js";

describe("Auth 외부 인증 가입 계약", () => {
  const attempt = {
    ticket: "t".repeat(43),
    attemptId: "a".repeat(43),
    clientId: "gaegaeting-web",
  };
  const claim = {
    ticketId: "ticket-1",
    provider: "kakao",
    providerSub: "123456789",
    clientId: attempt.clientId,
    issuer: "https://auth.example.test/t/gaegaeting/oidc",
    expiresAt: "2026-10-05T00:10:00Z",
  };
  const config = {
    getOrThrow: (key: string) =>
      (
        ({
          AUTH_BASE_URL: "https://auth.example.test",
          AUTH_TENANT_CODE: "gaegaeting",
          AUTH_PROVISIONING_CLIENT_ID: "gaegaeting-account-provisioner",
          AUTH_PROVISIONING_CLIENT_SECRET: "s".repeat(32),
        }) as Record<string, string>
      )[key],
  };
  const adapter = new AuthServiceExternalSignupAdapter(config as never);
  const originalFetch = globalThis.fetch;
  let requests: Array<{ url: string; init: RequestInit }>;
  function responses(body: unknown, status = 200) {
    requests = [];
    globalThis.fetch = jest.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        requests.push({ url: String(url), init: init! });
        return requests.length === 1
          ? Response.json({ access_token: "service-token" })
          : Response.json(body, { status });
      },
    ) as typeof fetch;
  }
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("서비스 토큰으로만 티켓의 검증된 외부 identity를 확인한다", async () => {
    responses({
      ...claim,
      ci: "must-not-retain",
      profile: { phone: "must-not-retain" },
    });
    await expect(adapter.claim(attempt)).resolves.toEqual({
      ...claim,
      expiresAt: new Date(claim.expiresAt),
    });
    expect(requests.map((r) => r.url)).toEqual([
      "https://auth.example.test/t/gaegaeting/oidc/token",
      "https://auth.example.test/t/gaegaeting/provisioning/external-signups/claim",
    ]);
    expect(requests[0].init.body?.toString()).toBe(
      "grant_type=client_credentials&scope=auth.user.provision",
    );
    expect(requests[1].init.headers).toMatchObject({
      authorization: "Bearer service-token",
    });
    expect(requests[1].init.body).toBe(JSON.stringify(attempt));
    expect(
      requests.every((r) => r.init.redirect === "error" && r.init.signal),
    ).toBe(true);
  });

  test("인적 정보나 비밀번호 대신 티켓·시도 결합과 멱등 키만 전송한다", async () => {
    responses({ issuer: claim.issuer, subject: "auth-user" }, 201);
    await expect(
      adapter.complete({ ...attempt, idempotencyKey: "i".repeat(43) }),
    ).resolves.toEqual({ issuer: claim.issuer, authSubject: "auth-user" });
    expect(requests[1].url).toBe(
      "https://auth.example.test/t/gaegaeting/provisioning/external-signups/complete",
    );
    expect(requests[1].init.body).toBe(JSON.stringify(attempt));
    expect(requests[1].init.headers).toMatchObject({
      "idempotency-key": "i".repeat(43),
    });
  });

  test.each([400, 401, 403, 409])(
    "거절된 티켓은 원격 응답의 개인정보를 드러내지 않는다: %s",
    async (status) => {
      responses({ message: "private-ticket-and-identity" }, status);
      await expect(adapter.claim(attempt)).rejects.toThrow(
        "SOCIAL_SIGNUP_INVALID",
      );
    },
  );
  test.each([404, 410])(
    "만료된 티켓은 새 인증으로 안내할 수 있는 오류를 반환한다: %s",
    async (status) => {
      responses({}, status);
      await expect(adapter.claim(attempt)).rejects.toThrow(
        "SOCIAL_SIGNUP_EXPIRED",
      );
    },
  );
  test("Auth 장애는 임의의 성공이나 인증 실패로 처리하지 않는다", async () => {
    responses({ message: "upstream-private-details" }, 503);
    await expect(adapter.claim(attempt)).rejects.toThrow(
      "SOCIAL_SIGNUP_UNAVAILABLE",
    );
  });
  test.each([
    {},
    { ...claim, providerSub: 123 },
    { ...claim, expiresAt: "invalid" },
    { ...claim, issuer: "" },
  ])("불완전한 검증 응답으로는 가입을 진행하지 않는다: %j", async (body) => {
    responses(body);
    await expect(adapter.claim(attempt)).rejects.toThrow(
      "SOCIAL_SIGNUP_INVALID",
    );
  });
  test("비밀번호 없는 계정 생성 응답에는 유효한 issuer와 subject가 필요하다", async () => {
    responses({ subject: "auth-user" });
    await expect(
      adapter.complete({ ...attempt, idempotencyKey: "i".repeat(43) }),
    ).rejects.toThrow("SOCIAL_SIGNUP_INVALID");
  });
  test("서비스 토큰 획득 실패 시 가입 티켓을 외부 endpoint로 보내지 않는다", async () => {
    requests = [];
    globalThis.fetch = jest.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        requests.push({ url: String(url), init: init! });
        return Response.json({ error: "private-token-error" }, { status: 401 });
      },
    ) as typeof fetch;
    await expect(adapter.claim(attempt)).rejects.toThrow(
      "SOCIAL_SIGNUP_UNAVAILABLE",
    );
    expect(requests).toHaveLength(1);
  });
});
