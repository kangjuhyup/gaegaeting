import { readFileSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicKeys = new Set([
  "API_ENABLED",
  "STORE_PURCHASES_ENABLED",
  "GATEWAY_GRAPHQL_URL",
  "ACCOUNT_GRAPHQL_URL",
  "OIDC_ISSUER",
  "OIDC_CLIENT_ID",
  "OIDC_REDIRECT_URI",
  "OIDC_LOGOUT_URI",
  "API_AUDIENCE",
  "MAP_TILE_URL",
  "MAP_ATTRIBUTION",
  "IMAGE_STORAGE_ORIGIN",
]);
const signingNames = [
  "GAEGAETING_UPLOAD_STORE_FILE",
  "GAEGAETING_UPLOAD_STORE_PASSWORD",
  "GAEGAETING_UPLOAD_KEY_ALIAS",
  "GAEGAETING_UPLOAD_KEY_PASSWORD",
];

function publicHttps(value, { originOnly = false } = {}) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.search &&
      !u.hash &&
      !["localhost", "0.0.0.0", "[::]", "[::1]"].includes(u.hostname) &&
      !/^(?:127\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|169\.254\.)/.test(
        u.hostname,
      ) &&
      !/\.(?:local|localhost|test)$/.test(u.hostname) &&
      !/^\[(?:fc|fd|fe80:)/i.test(u.hostname) &&
      !/(?:example\.(com|org|invalid)|\.invalid$)/.test(u.hostname) &&
      (!originOnly || value === u.origin)
    );
  } catch {
    return false;
  }
}

// Only fixed diagnostics are returned. Config values, unknown key names,
// filesystem paths, credentials and raw exception text never appear in output.
export function inspectRelease({
  config,
  environment,
  platform,
  env = {},
  xcode = "",
  iosSdk = "",
  iosProject = "",
  fileExists = () => false,
}) {
  const checks = [];
  const check = (id, ok, action) =>
    checks.push({ id, status: ok ? "pass" : "blocked", action });
  const c =
    config && typeof config === "object" && !Array.isArray(config)
      ? config
      : {};
  check(
    "public-config-only",
    Object.keys(c).every((k) => publicKeys.has(k)),
    "Use only documented public app settings; keep all secrets in the server/runner secret store.",
  );
  check(
    "api-mode",
    c.API_ENABLED === true,
    "Release uses the real API, not preview mode.",
  );
  check(
    "stores-disabled",
    c.STORE_PURCHASES_ENABLED === false,
    "Keep purchases disabled for this release preparation.",
  );
  for (const key of [
    "GATEWAY_GRAPHQL_URL",
    "ACCOUNT_GRAPHQL_URL",
    "OIDC_ISSUER",
    "API_AUDIENCE",
  ]) {
    check(
      key.toLowerCase(),
      publicHttps(c[key]),
      "Provide a verified public HTTPS endpoint without credentials.",
    );
  }
  check(
    "image-origin",
    publicHttps(c.IMAGE_STORAGE_ORIGIN, { originOnly: true }),
    "Set the verified allowlisted HTTPS storage origin, with no path or signed query.",
  );
  check(
    "native-client",
    typeof c.OIDC_CLIENT_ID === "string" &&
      c.OIDC_CLIENT_ID.trim() !== "" &&
      !/web|example|placeholder/i.test(c.OIDC_CLIENT_ID),
    "Provide the registered public native PKCE client; this check does not prove registration.",
  );
  check(
    "native-redirects",
    c.OIDC_REDIRECT_URI === "app.gaegaeting:/oauth/callback" &&
      c.OIDC_LOGOUT_URI === "app.gaegaeting:/oauth/logout",
    "Match the app callback/logout with the native Auth registration.",
  );
  const urls = [
    "GATEWAY_GRAPHQL_URL",
    "ACCOUNT_GRAPHQL_URL",
    "OIDC_ISSUER",
    "API_AUDIENCE",
  ];
  check(
    "environment-selection",
    ["stg", "prod"].includes(environment),
    "Choose stg or prod explicitly.",
  );
  if (environment === "prod") {
    check(
      "production-config",
      urls.every(
        (k) =>
          typeof c[k] === "string" &&
          !/(?:test-|\/gaegaeting-dev\/|localhost|staging|\.stg\.)/i.test(c[k]),
      ) && !/-dev$/i.test(c.OIDC_CLIENT_ID ?? ""),
      "Use approved production connection values and a production native registration.",
    );
  }
  check(
    "map-config",
    publicHttps(c.MAP_TILE_URL) &&
      ["{z}", "{x}", "{y}"].every((s) => c.MAP_TILE_URL.includes(s)) &&
      typeof c.MAP_ATTRIBUTION === "string" &&
      c.MAP_ATTRIBUTION.trim() !== "",
    "Provide the approved HTTPS XYZ tile service and visible attribution; review its usage policy separately.",
  );
  check(
    "platform-selection",
    ["android", "ios", "all"].includes(platform),
    "Choose android, ios or all.",
  );
  if (["android", "all"].includes(platform)) {
    check(
      "android-upload-signing",
      signingNames.every((k) => typeof env[k] === "string" && env[k].trim()) &&
        fileExists(env.GAEGAETING_UPLOAD_STORE_FILE),
      "Inject the four GAEGAETING_UPLOAD_* runner settings and existing keystore; certificate validity is a separate gate.",
    );
    check(
      "android-signing-required",
      env.GAEGAETING_REQUIRE_UPLOAD_SIGNING === "true",
      "Set GAEGAETING_REQUIRE_UPLOAD_SIGNING=true for store artifact builds.",
    );
  }
  if (["ios", "all"].includes(platform)) {
    check(
      "xcode-upload-version",
      Number(/Xcode\s+(\d+)/.exec(xcode)?.[1] ?? 0) >= 26,
      "Use Xcode 26+ on the release runner and revalidate pinned Flutter/plugins.",
    );
    check(
      "ios-upload-sdk",
      Number(/^(\d+)/.exec(iosSdk)?.[1] ?? 0) >= 26,
      "App Store uploads require an iOS 26+ SDK.",
    );
    check(
      "ios-team",
      /DEVELOPMENT_TEAM\s*=\s*[A-Z0-9]{10}\s*;/.test(iosProject) ||
        /^[A-Z0-9]{10}$/.test(env.GAEGAETING_IOS_TEAM_ID ?? ""),
      "Choose the Apple team in Xcode or provide GAEGAETING_IOS_TEAM_ID for the documented xcodebuild signing step.",
    );
  }
  return {
    localChecksPassed: checks.every((x) => x.status === "pass"),
    releaseApproved: false,
    scope:
      "local configuration only; does not prove live API, signing identity or store approval",
    checks,
  };
}

function main() {
  const options = {};
  for (const arg of process.argv.slice(2)) {
    const m = /^--(config|environment|platform)=(.+)$/.exec(arg);
    if (!m) throw new Error("invalid arguments");
    options[m[1]] = m[2];
  }
  let config;
  try {
    config = JSON.parse(readFileSync(resolve(options.config ?? ""), "utf8"));
  } catch {
    process.stdout.write(
      JSON.stringify(
        {
          localChecksPassed: false,
          releaseApproved: false,
          checks: [
            {
              id: "config-readable",
              status: "blocked",
              action: "Provide a valid public JSON config via --config=path.",
            },
          ],
        },
        null,
        2,
      ) + "\n",
    );
    process.exitCode = 2;
    return;
  }
  const read = (path) => {
    try {
      return readFileSync(path, "utf8");
    } catch {
      return "";
    }
  };
  const command = (args) => {
    try {
      return execFileSync("xcodebuild", args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      return "";
    }
  };
  const ios = ["ios", "all"].includes(options.platform);
  const result = inspectRelease({
    config,
    environment: options.environment,
    platform: options.platform,
    env: process.env,
    xcode: ios ? command(["-version"]) : "",
    iosSdk: ios
      ? (command(["-showsdks"]).match(/-sdk iphoneos(\d+(?:\.\d+)?)/)?.[1] ??
        "")
      : "",
    iosProject: read(resolve(appRoot, "ios/Runner.xcodeproj/project.pbxproj")),
    fileExists: (path) => {
      try {
        return statSync(path).isFile();
      } catch {
        return false;
      }
    },
  });
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  process.exitCode = result.localChecksPassed ? 0 : 2;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    main();
  } catch {
    process.stderr.write(
      "Release preflight failed; use --config=path --environment=stg|prod --platform=android|ios|all.\n",
    );
    process.exitCode = 2;
  }
}
