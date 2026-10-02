import assert from "node:assert/strict";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const originalWindow = globalThis.window;
globalThis.window = {};
const server = await createServer({
  configFile: false,
  plugins: [react()],
  cacheDir: "node_modules/.vite/qa-ssr",
  root: fileURLToPath(new URL("../", import.meta.url)),
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true, entries: [] },
  appType: "custom",
});
after(async () => {
  await server.close();
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
});
const { loadOnboarding, onboardingRoute } = await server.ssrLoadModule(
  "/src/lib/onboarding.ts",
);
const { Shell } = await server.ssrLoadModule("/src/components/Shell.tsx");

test("login resumes at the first unfinished registration step and completed accounts enter main", async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const [data, expected] of [
      [{ myProfile: null, pets: [] }, "profile"],
      [{ myProfile: null, pets: [{ id: 1 }] }, "profile"],
      [{ myProfile: { id: "qa" }, pets: [] }, "pet"],
      [{ myProfile: { id: "qa" }, pets: [{ id: 1 }] }, "ready"],
    ]) {
      globalThis.fetch = async (_url, options) => {
        const request = JSON.parse(options.body);
        assert.match(request.query, /query Onboarding/);
        assert.equal(options.headers.authorization, "Bearer qa-memory");
        return Response.json({ data });
      };
      assert.equal(await loadOnboarding("/graphql", "qa-memory"), expected);
    }
    globalThis.fetch = async () =>
      Response.json({
        errors: [{ message: "registration lookup unavailable" }],
      });
    await assert.rejects(
      loadOnboarding("/graphql", "qa-memory"),
      /unavailable/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("future menu URLs cannot bypass login, profile or pet registration", () => {
  for (const route of ["pet", "recommendations", "likes", "chats"]) {
    assert.equal(onboardingRoute(route, false), "login");
    assert.equal(onboardingRoute(route, true, "profile"), "profile");
    assert.equal(onboardingRoute(route, true, "pet"), "pet");
  }
  assert.equal(onboardingRoute("profile", true, "pet"), "profile");
  assert.equal(onboardingRoute("login", true, "ready"), "recommendations");
  assert.equal(onboardingRoute("chats", true, "ready"), "chats");
  assert.equal(onboardingRoute("storyboard", false), "storyboard");
});

test("bottom tabs appear only after both registrations, including profile management", () => {
  for (const onboardingComplete of [false, true]) {
    const html = renderToStaticMarkup(
      createElement(Shell, {
        route: "profile",
        connected: true,
        onboardingComplete,
        onNavigate() {},
      }),
    );
    assert.equal(html.includes('aria-label="주요 메뉴"'), onboardingComplete);
    assert.equal(
      html.includes('aria-label="가입 및 프로필 설정 단계"'),
      !onboardingComplete,
    );
    if (onboardingComplete)
      for (const label of ["추천", "보낸 관심", "채팅", "내 정보"])
        assert.ok(html.includes(label));
  }
});

test("logout stays available after registration and pending logout disables the action", () => {
  const loggedIn = renderToStaticMarkup(
    createElement(Shell, {
      route: "recommendations",
      connected: true,
      onboardingComplete: true,
      onNavigate() {},
      onLogout() {},
    }),
  );
  assert.ok(loggedIn.includes("로그아웃"));
  assert.ok(loggedIn.includes('aria-label="주요 메뉴"'));
  const pending = renderToStaticMarkup(
    createElement(Shell, {
      route: "login",
      connected: false,
      loggingOut: true,
      onNavigate() {},
      onLogout() {},
    }),
  );
  assert.ok(pending.includes("로그아웃 중…"));
  assert.ok(pending.includes('disabled=""'));
  assert.ok(!pending.includes('aria-label="주요 메뉴"'));
});
