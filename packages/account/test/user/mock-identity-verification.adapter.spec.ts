import { ConfigService } from "@nestjs/config";
import { MockIdentityVerificationAdapter } from "../../src/user/infrastructure/adapter/outbound/identity/mock-identity-verification.adapter.js";

describe("임시 본인인증", () => {
  const input = {
    name: "홍길동",
    birthDate: "1996-05-14",
    gender: "FEMALE" as const,
    phone: "01012345678",
  };
  const legacy = {
    providerTransactionId: "legacy-tx",
    ci: "legacy-ci",
    di: "legacy-di",
    adult: true,
  };
  const config = {
    NODE_ENV: "test",
    REGISTRATION_MOCK_ENABLED: true,
    REGISTRATION_DI_HMAC_SECRET: "s".repeat(32),
  };

  test("정규화한 동일 신원에는 같은 DI를 발급하고 요청마다 새 거래 ID를 발급한다", async () => {
    const adapter = new MockIdentityVerificationAdapter(
      new ConfigService(config),
    );
    const first = await adapter.request(input);
    const retry = await adapter.request({
      ...input,
      name: " 홍길동 ",
      phone: "010-1234-5678",
    });
    expect(first.di).toBe(retry.di);
    expect(first.ci).toBe(retry.ci);
    expect(first.di).not.toBe(first.ci);
    expect(first.providerTransactionId).not.toBe(retry.providerTransactionId);
    expect(first).toMatchObject({
      provider: "mock",
      adult: true,
      identity: input,
      verifiedAt: expect.any(Date),
    });
    const another = await adapter.request({
      ...input,
      birthDate: "1990-01-01",
    });
    expect(another.di).not.toBe(first.di);
  });

  test("미성년 테스트 신원의 인증 결과에는 성인 자격을 부여하지 않는다", async () => {
    const adapter = new MockIdentityVerificationAdapter(
      new ConfigService(config),
    );
    expect(
      (await adapter.request({ ...input, birthDate: "2020-01-01" })).adult,
    ).toBe(false);
  });

  test.each([
    { NODE_ENV: "production", REGISTRATION_MOCK_ENABLED: true },
    { NODE_ENV: "production", REGISTRATION_MOCK_ENABLED: false },
    { NODE_ENV: "test", REGISTRATION_MOCK_ENABLED: false },
  ])(
    "운영 또는 비활성 환경에서는 신규 요청과 기존 handoff 모두 차단한다: %j",
    async (override) => {
      const adapter = new MockIdentityVerificationAdapter(
        new ConfigService({ ...config, ...override }),
      );
      await expect(adapter.request(input)).rejects.toThrow("disabled");
      await expect(adapter.verify(legacy)).rejects.toThrow("disabled");
    },
  );

  test("기존 handoff용 인증 결과 계약을 유지한다", async () => {
    const adapter = new MockIdentityVerificationAdapter(
      new ConfigService(config),
    );
    await expect(adapter.verify(legacy)).resolves.toEqual(legacy);
    await expect(adapter.verify({ ...legacy, di: "" })).rejects.toThrow(
      "incomplete",
    );
  });
});
