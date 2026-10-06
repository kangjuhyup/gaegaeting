import { readPaymentConfiguration } from "./config.js";

const env = {
  NODE_ENV: "test",
  INTERNAL_AUTH_ASSERTION_SECRET: "secret".repeat(8),
  PAYMENT_PROOF_ENCRYPTION_KEY: "aa".repeat(32),
  PAYMENT_DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/payment_test",
};
describe("결제 실행 환경의 안전한 기본값", () => {
  test("자격증명 미설정 스토어를 활성화하지 않는다", () => {
    expect(readPaymentConfiguration(env)).toMatchObject({
      environment: "Sandbox",
      port: 2802,
    });
    expect(readPaymentConfiguration(env).apple).toBeUndefined();
    expect(readPaymentConfiguration(env).google).toBeUndefined();
  });
  test.each([
    "INTERNAL_AUTH_ASSERTION_SECRET",
    "PAYMENT_PROOF_ENCRYPTION_KEY",
    "PAYMENT_DATABASE_URL",
  ])("%s 누락은 임의 기본값으로 실행하지 않는다", (key) => {
    expect(() =>
      readPaymentConfiguration({ ...env, [key]: undefined }),
    ).toThrow();
  });
  test("운영 서버에서는 Sandbox 결제를 허용하지 않는다", () => {
    expect(() =>
      readPaymentConfiguration({
        ...env,
        NODE_ENV: "production",
        PAYMENT_STORE_ENVIRONMENT: "Sandbox",
      }),
    ).toThrow("PAYMENT_STORE_ENVIRONMENT");
  });
  test("Apple 결제 활성화 시 필요한 서버 설정이 누락되면 시작하지 않는다", () => {
    expect(() =>
      readPaymentConfiguration({ ...env, PAYMENT_APPLE_ENABLED: "true" }),
    ).toThrow("PAYMENT_APPLE_ROOT_CERT_PATHS");
  });
  test("명시적인 플래그와 유효한 서비스 포트만 허용한다", () => {
    expect(() =>
      readPaymentConfiguration({ ...env, PAYMENT_WORKER_ENABLED: "yes" }),
    ).toThrow();
    expect(() =>
      readPaymentConfiguration({ ...env, PAYMENT_SERVICE_API_PORT: "0" }),
    ).toThrow();
  });
});
