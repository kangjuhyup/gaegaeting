import assert from "node:assert/strict";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const originalWindow = globalThis.window;
const originalFetch = globalThis.fetch;
let assigned;
globalThis.window = {
  location: { pathname: "/interaction", origin: "https://ui.example.test",
    href: "https://ui.example.test/interaction?tenantCode=dev&uid=synthetic-interaction#interaction_token=synthetic-token&csrf_token=synthetic-csrf",
    assign(value) { assigned = value; } },
  history: { replaceState() {} },
  GAEGAETING_CONFIG: { authOrigin: "https://auth.example.test", tenantCode: "dev", clientId: "gaegaeting-web", basePath: "",
    interactionClientIds: ["gaegaeting-web", "gaegaeting-mobile"], issuer: "https://auth.example.test/t/dev/oidc" },
};
const server = await createServer({ configFile: false,
  cacheDir: "node_modules/.vite/qa-interaction-abort", root: fileURLToPath(new URL("../", import.meta.url)),
  server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true, entries: [] }, appType: "custom" });
after(async () => {
  await server.close(); globalThis.fetch = originalFetch;
  if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
});
const { abortInteraction } = await server.ssrLoadModule(fileURLToPath(new URL("../../ui-common/src/lib/interaction.ts", import.meta.url)));

test("native recovery abort keeps interaction credentials and CSRF bound to Auth's original RP resume", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://auth.example.test/t/dev/interaction/synthetic-interaction/api/abort");
    assert.equal(options.method, "POST"); assert.equal(options.credentials, "include");
    assert.equal(options.headers.authorization, "Bearer synthetic-token");
    assert.equal(options.headers["x-interaction-csrf"], "synthetic-csrf");
    assert.deepEqual(JSON.parse(options.body), {});
    return Response.json({ redirectTo: "/t/dev/oidc/auth/synthetic-resume" });
  };
  await abortInteraction();
  assert.equal(assigned, "https://auth.example.test/t/dev/oidc/auth/synthetic-resume");
});

test("abort failures or an untrusted callback never start a replacement web/native authorization", async () => {
  for (const response of [new Response(null, { status: 403 }), Response.json({}),
    Response.json({ redirectTo: "https://evil.example.test/login" }), Response.json({ redirectTo: "app.gaegaeting:/oauth/callback" })]) {
    assigned = undefined;
    globalThis.fetch = async () => response;
    await assert.rejects(abortInteraction()); assert.equal(assigned, undefined);
  }
});
