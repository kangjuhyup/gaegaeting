import { readFileSync } from "node:fs";
import {
  readDatabaseConnectionOptions,
  resolveDatabaseSsl,
  type DatabaseSslMode,
} from "@core/database";
import type { PoolConfig } from "pg";
import type { StoreEnvironment } from "./payment/domain/payment.js";
import type { AppleStoreOptions } from "./payment/infrastructure/stores/apple-store.js";
import type { GoogleStoreOptions } from "./payment/infrastructure/stores/google-store.js";

export interface PaymentConfiguration {
  port: number;
  secret: string;
  encryptionKey: string;
  environment: StoreEnvironment;
  database: PoolConfig;
  apple?: AppleStoreOptions;
  google?: GoogleStoreOptions;
  worker: boolean;
}
export function readPaymentConfiguration(
  env: NodeJS.ProcessEnv,
): PaymentConfiguration {
  const required = (key: string): string => {
    if (!env[key]?.trim()) throw new Error(`${key} is required`);
    return env[key]!;
  };
  const flag = (key: string, fallback = false) => {
    if (env[key] === undefined) return fallback;
    if (!["true", "false"].includes(env[key]!))
      throw new Error(`${key} must be true or false`);
    return env[key] === "true";
  };
  const port = Number(env.PAYMENT_SERVICE_API_PORT ?? 2802);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PAYMENT_SERVICE_API_PORT is invalid");
  const secret = required("INTERNAL_AUTH_ASSERTION_SECRET");
  if (secret.length < 32)
    throw new Error(
      "INTERNAL_AUTH_ASSERTION_SECRET must contain at least 32 characters",
    );
  const encryptionKey = required("PAYMENT_PROOF_ENCRYPTION_KEY");
  if (!/^[a-fA-F0-9]{64}$/.test(encryptionKey))
    throw new Error("PAYMENT_PROOF_ENCRYPTION_KEY must be 64 hex characters");
  const environment = (env.PAYMENT_STORE_ENVIRONMENT ??
    (env.NODE_ENV === "production"
      ? "Production"
      : "Sandbox")) as StoreEnvironment;
  if (
    !["Sandbox", "Production"].includes(environment) ||
    (env.NODE_ENV === "production" && environment !== "Production")
  )
    throw new Error("PAYMENT_STORE_ENVIRONMENT is invalid for this runtime");
  let database: PoolConfig;
  if (env.PAYMENT_DATABASE_URL) {
    let url: URL;
    try {
      url = new URL(env.PAYMENT_DATABASE_URL);
    } catch {
      throw new Error("PAYMENT_DATABASE_URL is invalid");
    }
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname ||
      url.pathname === "/"
    )
      throw new Error("PAYMENT_DATABASE_URL is invalid");
    database = {
      connectionString: env.PAYMENT_DATABASE_URL,
      ssl: resolveDatabaseSsl(
        env.DATABASE_SSL_MODE as DatabaseSslMode | undefined,
      ),
    };
  } else {
    for (const key of [
      "DATABASE_HOST",
      "DATABASE_USERNAME",
      "DATABASE_PASSWORD",
      "DATABASE_NAME",
    ])
      required(key);
    database = readDatabaseConnectionOptions({
      get: <T>(key: string, fallback?: T) => (env[key] ?? fallback) as T,
    });
    if (
      !Number.isInteger(database.port) ||
      database.port < 1 ||
      database.port > 65535
    )
      throw new Error("DATABASE_PORT is invalid");
  }
  const config: PaymentConfiguration = {
    port,
    secret,
    encryptionKey,
    environment,
    database,
    worker: flag("PAYMENT_WORKER_ENABLED", true),
  };
  // Store SKU allow-list is server-owned and covers base and event products.
  const products = (key: string) =>
    required(key)
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  if (flag("PAYMENT_APPLE_ENABLED")) {
    const rootCertificates = required("PAYMENT_APPLE_ROOT_CERT_PATHS")
      .split(",")
      .map((path) => readFileSync(path.trim()));
    config.apple = {
      bundleId: required("PAYMENT_APPLE_BUNDLE_ID"),
      environment,
      appAppleId: env.PAYMENT_APPLE_APP_ID
        ? Number(env.PAYMENT_APPLE_APP_ID)
        : undefined,
      signingKey: readFileSync(
        required("PAYMENT_APPLE_SIGNING_KEY_PATH"),
        "utf8",
      ),
      keyId: required("PAYMENT_APPLE_KEY_ID"),
      issuerId: required("PAYMENT_APPLE_ISSUER_ID"),
      rootCertificates,
      productIds: products("PAYMENT_APPLE_PRODUCT_IDS"),
    };
  }
  if (flag("PAYMENT_GOOGLE_ENABLED")) {
    config.google = {
      packageName: required("PAYMENT_GOOGLE_PACKAGE_NAME"),
      environment,
      pushAudience: required("PAYMENT_GOOGLE_PUSH_AUDIENCE"),
      pushServiceAccountEmail: required(
        "PAYMENT_GOOGLE_PUSH_SERVICE_ACCOUNT_EMAIL",
      ),
      productIds: products("PAYMENT_GOOGLE_PRODUCT_IDS"),
    };
    if (
      env.NODE_ENV === "production" &&
      !config.google.pushAudience.startsWith("https://")
    )
      throw new Error("PAYMENT_GOOGLE_PUSH_AUDIENCE must use HTTPS");
    // GoogleAuth uses ADC or GOOGLE_APPLICATION_CREDENTIALS, without exposing keys in GraphQL.
  }
  return config;
}
