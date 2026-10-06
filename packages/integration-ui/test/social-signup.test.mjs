import assert from "node:assert/strict";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const originalWindow = globalThis.window;
globalThis.window = { location: { pathname: "/signup", origin: "https://ui.example.test" }, GAEGAETING_CONFIG: {
  authOrigin: "https://auth.example.test", tenantCode: "dev", clientId: "gaegaeting-web", basePath: "", issuer: "https://auth.example.test/t/dev/oidc",
} };
const server = await createServer({
  configFile: false, plugins: [react()], cacheDir: "node_modules/.vite/qa-social-signup",
  root: fileURLToPath(new URL("../", import.meta.url)),
  server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true, entries: [] }, appType: "custom",
});
after(async () => {
  await server.close();
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
});
const { SignupPage } = await server.ssrLoadModule("/src/pages/SignupPage.tsx");
const { LoginPage } = await server.ssrLoadModule("/src/pages/LoginPage.tsx");
const { registerSocialSignup, socialSignupError } = await server.ssrLoadModule("/src/lib/social-signup.ts");
const { continueKakaoLink, validateKakaoAuthorizationUrl } = await server.ssrLoadModule("/src/lib/kakao-link.ts");
const config = { accountUrl: "/account/graphql" };
const signup = { provider: "kakao", ticket: "opaque-ticket-not-a-subject-123456789", attemptId: "opaque-attempt-123456789", expiresAt: new Date(Date.now() + 60_000).toISOString() };

test("Kakao signup asks for verified identity and terms without requesting credentials or email", () => {
  const html = renderToStaticMarkup(createElement(SignupPage, { config, social: signup, onLogin() {}, onSocialComplete() {} }));
  for (const label of ["이름", "생년월일", "성별", "휴대전화 번호", "서비스 이용약관"]) assert.ok(html.includes(label));
  for (const absent of ["비밀번호", "아이디", "이메일", signup.ticket, signup.attemptId]) assert.ok(!html.includes(absent));
});

test("ordinary signup keeps credentials and exposes Kakao signup; login exposes Kakao login", () => {
  const ordinary = renderToStaticMarkup(createElement(SignupPage, { config, onLogin() {} }));
  for (const label of ["아이디", "비밀번호", "이메일", "카카오로 회원가입"]) assert.ok(ordinary.includes(label));
  const login = renderToStaticMarkup(createElement(LoginPage, { config, connected: false, onNext() {}, onSignup() {} }));
  assert.ok(login.includes("카카오로 로그인"));
});

test("social enrollment sends the ticket and verified identity to Account without Auth subjects or credentials", async () => {
  const previousFetch = globalThis.fetch;
  const identity = { name: "테스트", birthDate: "1990-01-01", gender: "FEMALE", phone: "01012345678", termsVersion: "2026-09-01", termsAgreed: true };
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, config.accountUrl);
      assert.equal(options.headers.authorization, undefined);
      const payload = JSON.parse(options.body);
      assert.match(payload.query, /registerSocialAccount/);
      assert.deepEqual(payload.variables.input, { ...identity, ticket: signup.ticket, attemptId: signup.attemptId });
      return Response.json({ data: { registerSocialAccount: { authSubject: "new-subject" } } });
    };
    assert.deepEqual(await registerSocialSignup(config.accountUrl, signup, identity), { authSubject: "new-subject" });
    globalThis.fetch = async () => { throw new Error("expired tickets must not be sent"); };
    await assert.rejects(registerSocialSignup(config.accountUrl, { ...signup, expiresAt: "2000-01-01" }, identity), /SOCIAL_SIGNUP_EXPIRED/);
  } finally { globalThis.fetch = previousFetch; }
});

test('native social signup forwards only the validated interaction client selector', async () => {
  const previousFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (_url, options) => {
      const value = JSON.parse(options.body).variables.input;
      assert.equal(value.clientId, 'gaegaeting-mobile');
      assert.equal(value.authSubject, undefined);
      assert.equal(options.headers.authorization, undefined);
      return Response.json({ data: { registerSocialAccount: { authSubject: 'synthetic-subject' } } });
    };
    await registerSocialSignup(config.accountUrl, { ...signup, clientId: 'gaegaeting-mobile' }, { termsVersion: 'v1', termsAgreed: true });
  } finally { globalThis.fetch = previousFetch; }
});

test("duplicate identity directs existing login and linking; expired authentication restarts; temporary failures retry", () => {
  const duplicate = socialSignupError(new Error("IDENTITY_ALREADY_REGISTERED"));
  assert.equal(duplicate.recovery, "login");
  assert.match(duplicate.message, /기존 계정.*카카오 계정.*연결/);
  for (const code of ["SOCIAL_SIGNUP_EXPIRED", "SOCIAL_SIGNUP_INVALID"]) assert.equal(socialSignupError(new Error(code)).recovery, "restart");
  assert.equal(socialSignupError(new Error("SOCIAL_SIGNUP_UNAVAILABLE")).recovery, "retry");
});

const authorizationUrl = "https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=public-app&state=opaque&redirect_uri=" + encodeURIComponent("https://auth.example.test/auth/identity-links/kakao/callback?tenantCode=dev");
test("Kakao linking accepts only Kakao HTTPS authorization with the configured Auth callback", () => {
  assert.equal(validateKakaoAuthorizationUrl(authorizationUrl), authorizationUrl);
  for (const unsafe of [
    authorizationUrl.replace("https:", "http:"), authorizationUrl.replace("kauth.kakao.com", "kauth.kakao.com.evil.test"),
    authorizationUrl.replace("/oauth/authorize", "/other"), authorizationUrl.replace("response_type=code", "response_type=token"),
    authorizationUrl.replace("auth.example.test", "evil.example.test"),
  ]) assert.throws(() => validateKakaoAuthorizationUrl(unsafe));
});

test("linking refuses another reauthenticated account before any request; matching account uses an opaque token only at Auth", async () => {
  const previousFetch = globalThis.fetch;
  const previousAssign = window.location.assign;
  let calls = 0;
  let redirected;
  window.location.assign = (url) => { redirected = url; };
  try {
    globalThis.fetch = async (url, options) => {
      calls += 1;
      assert.equal(url, "https://auth.example.test/auth/identity-links/kakao/start?tenantCode=dev");
      assert.equal(options.headers.authorization, "Bearer memory-opaque-token");
      assert.equal(options.credentials, "include", "Auth must set the browser-bound HttpOnly callback cookie during link start");
      assert.equal(options.mode, "cors");
      assert.deepEqual(JSON.parse(options.body), { returnTo: "https://ui.example.test/login" });
      return Response.json({ authorizationUrl });
    };
    await assert.rejects(continueKakaoLink("old-sub", "different-sub", "memory-opaque-token"), /다른 계정/);
    assert.equal(calls, 0);
    await continueKakaoLink("old-sub", "old-sub", "memory-opaque-token");
    assert.equal(calls, 1);
    assert.equal(redirected, authorizationUrl);
    globalThis.fetch = async () => new Response(null, { status: 403 });
    await assert.rejects(continueKakaoLink("old-sub", "old-sub", "memory-opaque-token"), /기존 계정.*다시 로그인/);
  } finally { globalThis.fetch = previousFetch; window.location.assign = previousAssign; }
});
