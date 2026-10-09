import test from "node:test";
import assert from "node:assert/strict";
import { inspectRelease } from "../tool/release_preflight.mjs";

const config = {
  API_ENABLED: true,
  STORE_PURCHASES_ENABLED: false,
  GATEWAY_GRAPHQL_URL: "https://api.gaegaeting.app/gateway/graphql",
  ACCOUNT_GRAPHQL_URL: "https://api.gaegaeting.app/account/graphql",
  OIDC_ISSUER: "https://auth.gaegaeting.app/t/gaegaeting/oidc",
  OIDC_CLIENT_ID: "gaegaeting-mobile",
  OIDC_REDIRECT_URI: "app.gaegaeting:/oauth/callback",
  OIDC_LOGOUT_URI: "app.gaegaeting:/oauth/logout",
  API_AUDIENCE: "https://api.gaegaeting.app",
  IMAGE_STORAGE_ORIGIN: "https://images.gaegaeting.app",
  MAP_TILE_URL: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  MAP_ATTRIBUTION: "© OpenStreetMap contributors",
};
const env = {
  GAEGAETING_UPLOAD_STORE_FILE: "/secure/fixture.jks",
  GAEGAETING_UPLOAD_STORE_PASSWORD: "synthetic-password",
  GAEGAETING_UPLOAD_KEY_ALIAS: "synthetic-upload",
  GAEGAETING_UPLOAD_KEY_PASSWORD: "synthetic-key-password",
  GAEGAETING_REQUIRE_UPLOAD_SIGNING: "true",
};
const inspect = (overrides) =>
  inspectRelease({
    config,
    environment: "prod",
    platform: "android",
    env,
    fileExists: () => true,
    ...overrides,
  });
const blocked = (result, id) =>
  result.checks.some((c) => c.id === id && c.status === "blocked");

test("valid local configuration never claims live verification or release approval", () => {
  const r = inspect();
  assert.equal(r.localChecksPassed, true);
  assert.equal(r.releaseApproved, false);
});
test("preview mode, string booleans and enabled purchases cannot pass the disabled launch gate", () => {
  for (const c of [
    { ...config, API_ENABLED: false },
    { ...config, API_ENABLED: "true" },
    { ...config, STORE_PURCHASES_ENABLED: true },
    { ...config, STORE_PURCHASES_ENABLED: "false" },
  ]) {
    assert.equal(inspect({ config: c }).localChecksPassed, false);
  }
});
test("missing image origin and signed or path-bearing origins block upload preparation", () => {
  for (const origin of [
    "",
    "https://images.gaegaeting.app/folder",
    "https://images.gaegaeting.app?signature=synthetic-secret",
  ]) {
    assert.equal(
      blocked(
        inspect({ config: { ...config, IMAGE_STORAGE_ORIGIN: origin } }),
        "image-origin",
      ),
      true,
    );
  }
});
test("local or private endpoints cannot satisfy store connection preparation", () => {
  for (const host of [
    "localhost",
    "127.0.0.2",
    "10.0.2.2",
    "192.168.1.1",
    "172.16.0.1",
    "[::1]",
    "api.local",
  ]) {
    assert.equal(
      blocked(
        inspect({
          config: {
            ...config,
            GATEWAY_GRAPHQL_URL: `https://${host}/gateway/graphql`,
          },
        }),
        "gateway_graphql_url",
      ),
      true,
    );
  }
});
test("unknown private config and URL credentials never leak in diagnostic output", () => {
  const secret = "synthetic-secret-should-not-appear";
  const r = inspect({
    config: {
      ...config,
      [secret]: secret,
      GATEWAY_GRAPHQL_URL: `https://user:${secret}@api.gaegaeting.app/gateway/graphql`,
    },
    env: { ...env, GAEGAETING_UPLOAD_STORE_PASSWORD: secret },
  });
  assert.equal(blocked(r, "public-config-only"), true);
  assert.equal(blocked(r, "gateway_graphql_url"), true);
  assert.equal(JSON.stringify(r).includes(secret), false);
  assert.equal(JSON.stringify(r).includes("/secure/"), false);
});
test("web client and mismatched callbacks block native registration preparation", () => {
  assert.equal(
    blocked(
      inspect({ config: { ...config, OIDC_CLIENT_ID: "gaegaeting-web" } }),
      "native-client",
    ),
    true,
  );
  assert.equal(
    blocked(
      inspect({
        config: { ...config, OIDC_REDIRECT_URI: "https://web.gaegaeting.app" },
      }),
      "native-redirects",
    ),
    true,
  );
});
test("staging values cannot be accidentally accepted as production values", () => {
  for (const patch of [
    { GATEWAY_GRAPHQL_URL: "https://test-ggt-api.rvkang.app/gateway/graphql" },
    { OIDC_ISSUER: "https://auth.rvkang.app/t/gaegaeting-dev/oidc" },
    { OIDC_CLIENT_ID: "gaegaeting-mobile-dev" },
  ]) {
    const c = { ...config, ...patch };
    assert.equal(blocked(inspect({ config: c }), "production-config"), true);
    assert.equal(
      inspect({ config: c, environment: "stg" }).localChecksPassed,
      true,
    );
  }
});
test("absent, partial or unavailable upload credentials block Android store preparation", () => {
  for (const e of [{}, { ...env, GAEGAETING_UPLOAD_KEY_PASSWORD: "" }]) {
    assert.equal(blocked(inspect({ env: e }), "android-upload-signing"), true);
  }
  assert.equal(
    blocked(inspect({ fileExists: () => false }), "android-upload-signing"),
    true,
  );
  assert.equal(
    blocked(
      inspect({ env: { ...env, GAEGAETING_REQUIRE_UPLOAD_SIGNING: "" } }),
      "android-signing-required",
    ),
    true,
  );
});
test("iOS simulator success on Xcode 16 does not satisfy current upload requirements", () => {
  const r = inspect({
    platform: "ios",
    xcode: "Xcode 16.2",
    iosSdk: "18.2",
    iosProject: "",
  });
  for (const id of ["xcode-upload-version", "ios-upload-sdk", "ios-team"])
    assert.equal(blocked(r, id), true);
  assert.equal(
    inspect({
      platform: "ios",
      xcode: "Xcode 26.0",
      iosSdk: "26.0",
      iosProject: "DEVELOPMENT_TEAM = ABCD123456;",
    }).localChecksPassed,
    true,
  );
});
test("map without HTTPS XYZ source or attribution cannot appear release-ready", () => {
  for (const patch of [
    { MAP_TILE_URL: "" },
    { MAP_TILE_URL: "http://tile.local/{z}/{x}/{y}" },
    { MAP_TILE_URL: "https://tile.openstreetmap.org/image.png" },
    { MAP_ATTRIBUTION: "" },
  ]) {
    assert.equal(
      blocked(inspect({ config: { ...config, ...patch } }), "map-config"),
      true,
    );
  }
});
