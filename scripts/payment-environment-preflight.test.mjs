import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import test from "node:test";
import {
  baseProductIds,
  paymentPreflight,
} from "./payment-environment-preflight.mjs";

const syntheticPassword = randomUUID();
const env = () => ({
  NODE_ENV: "development",
  PAYMENT_SERVICE_API_PORT: "2802",
  PAYMENT_STORE_ENVIRONMENT: "Sandbox",
  PAYMENT_WORKER_ENABLED: "true",
  PAYMENT_APPLE_ENABLED: "false",
  PAYMENT_GOOGLE_ENABLED: "false",
  INTERNAL_AUTH_ASSERTION_SECRET: "a".repeat(32),
  PAYMENT_PROOF_ENCRYPTION_KEY: "b".repeat(64),
  DATABASE_HOST: "fixture.invalid",
  DATABASE_PORT: "5432",
  DATABASE_NAME: "fixture",
  DATABASE_USERNAME: "fixture",
  DATABASE_PASSWORD: syntheticPassword,
  DATABASE_SSL_MODE: "verify-full",
  PAYMENT_APPLE_PRODUCT_IDS: baseProductIds.join(","),
  PAYMENT_GOOGLE_PRODUCT_IDS: baseProductIds.join(","),
});

test("disabled launch validates without reading any store credential file", () => {
  const result = paymentPreflight(env(), "disabled", () => {
    throw new Error("store file should not be read");
  });
  assert.equal(result.valid, true);
  assert.equal(
    JSON.stringify(result).includes(syntheticPassword),
    false,
  );
});
test("a missing or enabled store switch fails a disabled launch", () => {
  for (const value of [undefined, "true", "FALSE"])
    assert.equal(
      paymentPreflight({ ...env(), PAYMENT_APPLE_ENABLED: value }).valid,
      false,
    );
});
test("deployment preflight resolves Payment identity and requires verified TLS", () => {
  assert.equal(
    paymentPreflight({
      ...env(),
      DATABASE_NAME: "",
      PAYMENT_DATABASE_NAME: "fixture",
    }).valid,
    true,
  );
  assert.equal(
    paymentPreflight({ ...env(), PAYMENT_DATABASE_NAME: "" }).valid,
    false,
  );
  assert.equal(
    paymentPreflight({ ...env(), DATABASE_SSL_MODE: "require" }).valid,
    false,
  );
  assert.equal(
    paymentPreflight({
      ...env(),
      PAYMENT_DATABASE_URL:
        "postgres://fixture.invalid/db?sslmode=disable",
    }).valid,
    false,
  );
});
test("Sandbox preflight cannot attest a Production runtime or missing keys", () => {
  assert.equal(
    paymentPreflight(
      { ...env(), PAYMENT_APPLE_ENABLED: "true", NODE_ENV: "production" },
      "sandbox-apple",
    ).valid,
    false,
  );
  assert.equal(
    paymentPreflight(
      { ...env(), PAYMENT_APPLE_ENABLED: "true" },
      "sandbox-apple",
    ).valid,
    false,
  );
});
test("broken mappings and secret-bearing file errors are reported only by check name", () => {
  const source = {
    ...env(),
    PAYMENT_APPLE_ENABLED: "true",
    PAYMENT_APPLE_SIGNING_KEY_PATH: "secret-path-canary",
    PAYMENT_APPLE_ROOT_CERT_PATHS: "secret-root-canary",
    PAYMENT_APPLE_PRODUCT_IDS: baseProductIds[0],
  };
  const result = paymentPreflight(source, "sandbox-apple", () => {
    throw new Error("private-key-canary");
  });
  assert.equal(result.valid, false);
  assert.doesNotMatch(
    JSON.stringify(result),
    /secret-path-canary|secret-root-canary|private-key-canary/,
  );
});
test("Google Sandbox checks file structure without calling Play or granting permissions", () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const source = {
    ...env(),
    PAYMENT_GOOGLE_ENABLED: "true",
    PAYMENT_GOOGLE_PACKAGE_NAME: "app.gaegaeting",
    PAYMENT_GOOGLE_PUSH_AUDIENCE:
      "https://fixture.invalid/payment/notifications/google",
    PAYMENT_GOOGLE_PUSH_SERVICE_ACCOUNT_EMAIL:
      "push@fixture.iam.gserviceaccount.com",
    GOOGLE_APPLICATION_CREDENTIALS: "fixture.json",
  };
  const read = () =>
    Buffer.from(
      JSON.stringify({
        type: "service_account",
        client_email: "play@fixture.iam.gserviceaccount.com",
        project_id: "fixture",
        private_key: privateKey.export({ format: "pem", type: "pkcs8" }),
      }),
    );
  const result = paymentPreflight(source, "sandbox-google", read);
  assert.equal(result.valid, true);
  assert.ok(result.externalNotVerified.includes("Play/IAM permissions"));
  assert.equal(
    paymentPreflight(
      { ...source, PAYMENT_GOOGLE_PUSH_AUDIENCE: "http://fixture.invalid/" },
      "sandbox-google",
      read,
    ).valid,
    false,
  );
});
