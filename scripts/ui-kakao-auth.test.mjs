import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const config = { authOrigin: "https://auth.example.test", tenantCode: "dev", clientId: "gaegaeting-web", interactionClientIds: ['gaegaeting-web', 'gaegaeting-mobile'], basePath: "", apiAudience: "https://api.example.test" };
const original = { window: globalThis.window, sessionStorage: globalThis.sessionStorage, fetch: globalThis.fetch };
const stored = new Map();
const redirected = [];
const cleaned = [];
globalThis.sessionStorage = { getItem: (key) => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: (key) => stored.delete(key) };
globalThis.window = { location: { pathname: "/interaction", href: "https://ui.example.test/interaction?tenantCode=dev&uid=abc#interaction_token=secret-token&csrf_token=secret-csrf", assign: (url) => redirected.push(url) }, history: { replaceState: (_a, _b, url) => cleaned.push(url) } };
async function load(name, settings = config) {
  const source = (await readFile(new URL(`../packages/ui-common/src/lib/${name}.ts`, import.meta.url), "utf8"))
    .replace(/import \{ publicConfig \} from ["']\.\.\/runtime-config\.js["'];/, `const publicConfig = ${JSON.stringify(settings)};`)
    .replaceAll("import.meta.env.DEV", "false");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import("data:text/javascript;base64," + Buffer.from(compiled).toString("base64"));
}
const interaction = await load("interaction");
const oidc = await load("oidc");
test.after(() => { for (const [key, value] of Object.entries(original)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } });
const signup = { provider: "kakao", ticket: "test-opaque-ticket-1234567890123456", attemptId: "test-attempt-123456", expiresAt: new Date(Date.now() + 60_000).toISOString() };
const details = { clientId: config.clientId, prompt: "login", missingScopes: [], idpList: [{ provider: "kakao", name: "카카오" }] };

test("external bootstrap removes fragment credentials before mounting and sends them only to protected Auth APIs", async () => {
  assert.deepEqual(cleaned, ["/interaction?tenantCode=dev&uid=abc"]);
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://auth.example.test/t/dev/interaction/abc/api/details");
    assert.equal(options.headers.authorization, "Bearer secret-token");
    assert.equal(options.headers["x-interaction-csrf"], "secret-csrf");
    return Response.json(details);
  };
  await interaction.interactionRequest("details");
  assert.equal(stored.size, 0);
});

test("expired social interactions request a fresh login while password login retains credential feedback", async () => {
  for (const status of [401, 403, 404, 410]) {
    globalThis.fetch = async () => new Response(null, { status });
    await assert.rejects(interaction.interactionRequest("external-signup/resume", { ticket: signup.ticket, attemptId: signup.attemptId }), interaction.InteractionExpiredError);
  }
  globalThis.fetch = async () => new Response(null, { status: 401 });
  await assert.rejects(interaction.interactionRequest("login", { username: "test", password: "test-password" }), /아이디 또는 비밀번호/);
});

test("Kakao preference is one-time local UI state while authorization retains standard PKCE parameters", async () => {
  globalThis.fetch = async () => Response.json({ issuer: "https://auth.example.test/t/dev/oidc", authorization_endpoint: "https://auth.example.test/t/dev/oidc/auth" });
  await oidc.beginLogin({ issuer: "https://auth.example.test/t/dev/oidc", clientId: config.clientId, redirectUri: "https://ui.example.test/login" }, { provider: "kakao", intent: "signup", prompt: "login" });
  const url = new URL(redirected.at(-1));
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("prompt"), "login");
  for (const param of ["provider", "intent", "ticket"]) assert.equal(url.searchParams.has(param), false);
  assert.equal(oidc.takeLoginProvider("gaegaeting-admin-web"), null);
  assert.deepEqual(oidc.takeLoginProvider(config.clientId), { provider: "kakao", intent: "signup" });
  assert.equal(oidc.takeLoginProvider(config.clientId), null);
});

test("signup details accept only the configured client, allowed Kakao provider and valid unexpired ticket", () => {
  assert.equal(interaction.validateInteractionDetails(details).externalSignup, undefined);
  assert.deepEqual(interaction.validateInteractionDetails({ ...details, externalSignup: signup }).externalSignup, { ...signup, clientId: config.clientId });
  for (const value of [
    { ...details, clientId: "other" }, { ...details, idpList: null },
    { ...details, idpList: [], externalSignup: signup },
    { ...details, externalSignup: { ...signup, provider: "google" } },
    { ...details, externalSignup: { ...signup, ticket: "" } },
    { ...details, externalSignup: { ...signup, ticket: "a".repeat(31) } },
    { ...details, externalSignup: { ...signup, ticket: "a".repeat(257) } },
    { ...details, externalSignup: { ...signup, attemptId: "" } },
    { ...details, externalSignup: { ...signup, expiresAt: "invalid" } },
    { ...details, externalSignup: { ...signup, expiresAt: "2000-01-01" } },
    { ...details, externalSignup: null },
  ]) assert.throws(() => interaction.validateInteractionDetails(value));
  for (const length of [32, 256]) assert.equal(interaction.validateInteractionDetails({ ...details, externalSignup: { ...signup, ticket: "a".repeat(length) } }).externalSignup.ticket.length, length);
});

test('shared user UI permits native details and binds signup to their client; admin and legacy stay restricted', async () => {
  const native = { ...details, clientId: 'gaegaeting-mobile', externalSignup: { ...signup, clientId: 'untrusted-nested-client' } };
  assert.equal(interaction.validateInteractionDetails(native).externalSignup.clientId, 'gaegaeting-mobile');
  for (const clientId of ['gaegaeting-admin-web', 'vote-web', 'gaegaeting-mobile-dev']) {
    assert.throws(() => interaction.validateInteractionDetails({ ...native, clientId }));
  }
  const admin = await load('interaction', { ...config, clientId: 'gaegaeting-admin-web', interactionClientIds: ['gaegaeting-admin-web'], basePath: '/admin' });
  assert.throws(() => admin.validateInteractionDetails(native));
  const legacy = await load('interaction', { ...config, interactionClientIds: undefined });
  assert.throws(() => legacy.validateInteractionDetails(native));
  assert.equal(legacy.validateInteractionDetails(details).clientId, 'gaegaeting-web');
});

test("IdP signup routing carries only explicit intent and ordinary Auth redirects remain restricted", () => {
  interaction.goToIdp("kakao", "signup");
  assert.equal(redirected.at(-1), "https://auth.example.test/t/dev/interaction/abc/idp/kakao?intent=signup");
  interaction.goToIdp("kakao");
  assert.equal(new URL(redirected.at(-1)).search, "");
  assert.throws(() => interaction.goToIdp("kakao/evil"));
  for (const unsafe of ["https://evil.example/t/dev/continue", "https://auth.example.test/t/other/continue", "https://kauth.kakao.com/oauth/authorize"]) assert.throws(() => interaction.goToAuth(unsafe));
});

test("linked Kakao login can continue MFA without requesting a password or ignoring invalid steps", () => {
  assert.deepEqual(interaction.validateInteractionDetails({ ...details, externalLoginResult: { mfaRequired: true, methods: ["totp", "recovery_code"] } }).externalLoginResult.methods, ["totp", "recovery_code"]);
  for (const value of [{}, { mfaRequired: "true" }, { mfaRequired: true, methods: ["unsupported"] }]) assert.throws(() => interaction.validateInteractionDetails({ ...details, externalLoginResult: value }));
});

test("Kakao account linking reauthenticates with standard PKCE without an Account API resource and preserves intended account", async () => {
  globalThis.fetch = async () => Response.json({ issuer: "https://auth.example.test/t/dev/oidc", authorization_endpoint: "https://auth.example.test/t/dev/oidc/auth" });
  const client = { issuer: "https://auth.example.test/t/dev/oidc", clientId: config.clientId, redirectUri: "https://ui.example.test/login" };
  await assert.rejects(oidc.beginLogin(client, { action: "link-kakao" }), /기존 계정/);
  await oidc.beginLogin(client, { action: "link-kakao", intendedSubject: "verified-original-subject", scopes: "openid profile", prompt: "login" });
  const url = new URL(redirected.at(-1));
  assert.equal(url.searchParams.has("resource"), false);
  assert.equal(url.searchParams.get("scope"), "openid profile");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.deepEqual(oidc.takeLoginAction(config.clientId), { action: "link-kakao", subject: "verified-original-subject" });
  assert.equal(oidc.takeLoginAction(config.clientId), null);
  for (const invalid of ["malformed", JSON.stringify({ subject: "old", createdAt: 0 })]) {
    stored.set(`gaegaeting.oidc.${config.clientId}.linkAction`, invalid);
    assert.throws(() => oidc.takeLoginAction(config.clientId), /만료/);
    assert.equal(stored.has(`gaegaeting.oidc.${config.clientId}.linkAction`), false);
  }
});

test("link continuation receives only a cryptographically verified ID-token subject and retains the one-time link intent until verification", async () => {
  const client = { issuer: "https://auth.example.test/t/dev/oidc", clientId: config.clientId, redirectUri: "https://ui.example.test/login" };
  const metadata = { issuer: client.issuer, authorization_endpoint: `${client.issuer}/auth`, token_endpoint: `${client.issuer}/token`, jwks_uri: `${client.issuer}/jwks` };
  globalThis.fetch = async () => Response.json(metadata);
  await oidc.beginLogin(client, { action: "link-kakao", intendedSubject: "verified-original-subject", scopes: "openid profile", prompt: "login" });
  const authUrl = new URL(redirected.at(-1));
  window.location.search = `?code=one-time-code&state=${authUrl.searchParams.get("state")}`;
  const keyPair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = { ...await crypto.subtle.exportKey("jwk", keyPair.publicKey), kid: "test-key" };
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: client.issuer, aud: config.clientId, sub: "verified-original-subject", nonce: stored.get(`gaegaeting.oidc.${config.clientId}.nonce`), iat: now, exp: now + 300 };
  const signed = `${encode({ alg: "RS256", kid: "test-key" })}.${encode(payload)}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keyPair.privateKey, new TextEncoder().encode(signed));
  let idToken = `${signed}.${Buffer.from(signature).toString("base64url")}`;
  globalThis.fetch = async (url, options) => {
    if (url === metadata.jwks_uri) return Response.json({ keys: [jwk] });
    if (options) return Response.json({ access_token: "memory-opaque-token", id_token: idToken });
    return Response.json(metadata);
  };
  // Changing the decoded subject without signing it cannot select the account to link.
  idToken = `${encode({ alg: "RS256", kid: "test-key" })}.${encode({ ...payload, sub: "forged-subject" })}.${Buffer.from(signature).toString("base64url")}`;
  await assert.rejects(oidc.completeLogin(client), /검증/);
  assert.ok(stored.has(`gaegaeting.oidc.${config.clientId}.linkAction`));
  idToken = `${signed}.${Buffer.from(signature).toString("base64url")}`;
  const verified = await oidc.completeLogin(client);
  assert.equal(verified.subject, "verified-original-subject");
  assert.equal(verified.accessToken, "memory-opaque-token");
  assert.deepEqual(oidc.takeLoginAction(config.clientId), { action: "link-kakao", subject: verified.subject });
  assert.equal(stored.has(`gaegaeting.oidc.${config.clientId}.verifier`), false);
});
