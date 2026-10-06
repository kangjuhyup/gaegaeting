// Offline checks only: never creates credentials, calls stores, or changes flags.
import { createPrivateKey, X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const baseProductIds = [10, 50, 100].map(
  (n) => `app.gaegaeting.snacks.${n}`,
);
const modes = ["disabled", "sandbox-apple", "sandbox-google", "sandbox-both"];

export function paymentPreflight(env, mode = "disabled", read = readFileSync) {
  env = {
    ...env,
    ...Object.fromEntries(
      ["NAME", "USERNAME", "PASSWORD"]
        .filter((suffix) => env[`PAYMENT_DATABASE_${suffix}`] !== undefined)
        .map((suffix) => [
          `DATABASE_${suffix}`,
          env[`PAYMENT_DATABASE_${suffix}`],
        ]),
    ),
  };
  const checks = [];
  const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });
  const text = (key) =>
    typeof env[key] === "string" && env[key].trim().length > 0;
  const file = (key) => {
    try {
      return text(key) ? read(env[key]) : undefined;
    } catch {
      return undefined;
    }
  };
  const sku = (key) => {
    const ids = (env[key] ?? "").split(",").map((id) => id.trim());
    return (
      ids.every(Boolean) &&
      new Set(ids).size === ids.length &&
      baseProductIds.every((id) => ids.includes(id))
    );
  };
  check("MODE", modes.includes(mode));
  const apple = mode === "sandbox-apple" || mode === "sandbox-both";
  const google = mode === "sandbox-google" || mode === "sandbox-both";
  check("PAYMENT_APPLE_ENABLED", env.PAYMENT_APPLE_ENABLED === String(apple));
  check(
    "PAYMENT_GOOGLE_ENABLED",
    env.PAYMENT_GOOGLE_ENABLED === String(google),
  );
  check("PAYMENT_WORKER_ENABLED", env.PAYMENT_WORKER_ENABLED === "true");
  check(
    "INTERNAL_AUTH_ASSERTION_SECRET",
    text("INTERNAL_AUTH_ASSERTION_SECRET") &&
      env.INTERNAL_AUTH_ASSERTION_SECRET.length >= 32,
  );
  check(
    "PAYMENT_PROOF_ENCRYPTION_KEY",
    /^[a-fA-F0-9]{64}$/.test(env.PAYMENT_PROOF_ENCRYPTION_KEY ?? ""),
  );
  check("DATABASE_SSL_MODE", env.DATABASE_SSL_MODE === "verify-full");
  // Accept either Payment-specific Doppler keys or workload-projected DB aliases.
  if (text("PAYMENT_DATABASE_URL")) {
    let valid = false;
    try {
      const u = new URL(env.PAYMENT_DATABASE_URL);
      valid =
        ["postgres:", "postgresql:"].includes(u.protocol) &&
        Boolean(u.hostname) &&
        u.pathname.length > 1 &&
        (!u.searchParams.has("sslmode") ||
          u.searchParams.get("sslmode") === "verify-full");
    } catch {
      /* Only a check name is reported, never the URI. */
    }
    check("PAYMENT_DATABASE_URL", valid);
  } else {
    for (const key of [
      "DATABASE_HOST",
      "DATABASE_NAME",
      "DATABASE_USERNAME",
      "DATABASE_PASSWORD",
    ])
      check(key, text(key));
    const port = Number(env.DATABASE_PORT);
    check(
      "DATABASE_PORT",
      Number.isInteger(port) && port >= 1 && port <= 65535,
    );
  }
  const port = Number(env.PAYMENT_SERVICE_API_PORT);
  check(
    "PAYMENT_SERVICE_API_PORT",
    Number.isInteger(port) && port >= 1 && port <= 65535,
  );
  check(
    "PAYMENT_STORE_ENVIRONMENT",
    mode === "disabled"
      ? ["Sandbox", "Production"].includes(env.PAYMENT_STORE_ENVIRONMENT) &&
          (env.NODE_ENV !== "production" ||
            env.PAYMENT_STORE_ENVIRONMENT === "Production")
      : env.PAYMENT_STORE_ENVIRONMENT === "Sandbox" &&
          env.NODE_ENV !== "production",
  );
  for (const key of ["PAYMENT_APPLE_PRODUCT_IDS", "PAYMENT_GOOGLE_PRODUCT_IDS"])
    check(key, sku(key));
  if (apple) {
    check(
      "PAYMENT_APPLE_BUNDLE_ID",
      env.PAYMENT_APPLE_BUNDLE_ID === "app.gaegaeting",
    );
    for (const key of ["PAYMENT_APPLE_KEY_ID", "PAYMENT_APPLE_ISSUER_ID"])
      check(key, text(key));
    let validKey = false;
    try {
      const pem = file("PAYMENT_APPLE_SIGNING_KEY_PATH");
      const key = pem && createPrivateKey(pem);
      validKey =
        key?.asymmetricKeyType === "ec" &&
        key.asymmetricKeyDetails?.namedCurve === "prime256v1";
    } catch {
      /* Do not report PEM, file paths or parser errors. */
    }
    check("PAYMENT_APPLE_SIGNING_KEY_PATH", validKey);
    let validRoots = false;
    try {
      const paths = (env.PAYMENT_APPLE_ROOT_CERT_PATHS ?? "")
        .split(",")
        .map((p) => p.trim());
      validRoots =
        paths.every(Boolean) &&
        paths.every((p) => {
          const cert = new X509Certificate(read(p));
          return (
            cert.ca &&
            Date.parse(cert.validFrom) <= Date.now() &&
            Date.parse(cert.validTo) > Date.now()
          );
        });
    } catch {
      /* Trust anchor identity still needs independent official-source verification. */
    }
    check("PAYMENT_APPLE_ROOT_CERT_PATHS", validRoots);
  }
  if (google) {
    check(
      "PAYMENT_GOOGLE_PACKAGE_NAME",
      env.PAYMENT_GOOGLE_PACKAGE_NAME === "app.gaegaeting",
    );
    let validAudience = false;
    try {
      const u = new URL(env.PAYMENT_GOOGLE_PUSH_AUDIENCE);
      validAudience =
        u.protocol === "https:" &&
        u.pathname === "/payment/notifications/google" &&
        !u.username &&
        !u.password &&
        !u.search &&
        !u.hash;
    } catch {
      /* Only the environment key is reported. */
    }
    check("PAYMENT_GOOGLE_PUSH_AUDIENCE", validAudience);
    check(
      "PAYMENT_GOOGLE_PUSH_SERVICE_ACCOUNT_EMAIL",
      /^[^\s@]+@[^\s@]+\.iam\.gserviceaccount\.com$/.test(
        env.PAYMENT_GOOGLE_PUSH_SERVICE_ACCOUNT_EMAIL ?? "",
      ),
    );
    let validCredentials = false;
    try {
      const bytes = file("GOOGLE_APPLICATION_CREDENTIALS");
      const credential = bytes && JSON.parse(bytes.toString());
      const key =
        credential?.private_key && createPrivateKey(credential.private_key);
      validCredentials =
        credential?.type === "service_account" &&
        key?.asymmetricKeyType === "rsa" &&
        /^[^\s@]+@[^\s@]+\.iam\.gserviceaccount\.com$/.test(
          credential.client_email,
        ) &&
        Boolean(credential.project_id);
    } catch {
      /* Never emit service account JSON or a secret-bearing exception. */
    }
    check("GOOGLE_APPLICATION_CREDENTIALS", validCredentials);
  }
  return {
    mode,
    valid: checks.every((c) => c.ok),
    checks,
    externalNotVerified: [
      "store contracts/products/prices",
      "Play/IAM permissions",
      "official Apple trust anchors",
      "live notifications",
      "native Auth client/scopes",
      "real user API E2E",
      "actual store purchase/refund",
    ],
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--mode" || !modes.includes(args[1])) {
    console.error(
      "Usage: node scripts/payment-environment-preflight.mjs --mode disabled|sandbox-apple|sandbox-google|sandbox-both",
    );
    process.exitCode = 2;
  } else {
    const result = paymentPreflight(process.env, args[1]);
    console.log(JSON.stringify(result));
    process.exitCode = result.valid ? 0 : 1;
  }
}
