import assert from "node:assert/strict";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const originalWindow = globalThis.window;
globalThis.window = { location: { pathname: "/", origin: "https://ui.example.test" }, GAEGAETING_CONFIG: {
  authOrigin: "https://auth.example.test", tenantCode: "dev", clientId: "gaegaeting-web", basePath: "",
  interactionClientIds: ["gaegaeting-web", "gaegaeting-mobile"], issuer: "https://auth.example.test/t/dev/oidc",
} };
const server = await createServer({ configFile: false,
  cacheDir: "node_modules/.vite/qa-interaction-client", root: fileURLToPath(new URL("../", import.meta.url)),
  server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true, entries: [] }, appType: "custom",
});
after(async () => {
  await server.close();
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
});
const modulePath = fileURLToPath(new URL("../../ui-common/src/lib/interaction.ts", import.meta.url));
const { validateInteractionDetails } = await server.ssrLoadModule(modulePath);
const details = { prompt: "login", clientId: "gaegaeting-web", missingScopes: [], idpList: [{ provider: "kakao", name: "Kakao" }] };
const signup = { provider: "kakao", ticket: "synthetic-ticket-12345678901234567890", attemptId: "synthetic-attempt-1234567890", expiresAt: new Date(Date.now() + 60_000).toISOString() };

test("shared interaction accepts approved web and native Auth clients", () => {
  for (const clientId of ["gaegaeting-web", "gaegaeting-mobile"]) {
    assert.equal(validateInteractionDetails({ ...details, clientId }).clientId, clientId);
  }
});
test("shared interaction rejects admin, Vote, old mobile alias and unregistered clients", () => {
  for (const clientId of ["gaegaeting-admin-web", "vote-web", "gaegaeting-mobile-dev", "unknown"]) {
    assert.throws(() => validateInteractionDetails({ ...details, clientId }));
  }
});
test("social signup selector comes from verified top-level interaction, overriding nested data", () => {
  const result = validateInteractionDetails({ ...details, clientId: "gaegaeting-mobile",
    externalSignup: { ...signup, clientId: "gaegaeting-admin-web", authSubject: "injected-subject" } });
  assert.deepEqual(result.externalSignup, { ...signup, clientId: "gaegaeting-mobile" });
});
test("a ticket does not bypass the client allowlist or provider and expiry validation", () => {
  assert.throws(() => validateInteractionDetails({ ...details, clientId: "unknown", externalSignup: signup }));
  assert.throws(() => validateInteractionDetails({ ...details, externalSignup: { ...signup, provider: "unknown" } }));
  assert.throws(() => validateInteractionDetails({ ...details, externalSignup: { ...signup, expiresAt: "2000-01-01T00:00:00Z" } }));
});
