import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// The browser-only module is compiled with its public runtime settings fixture.
const source = (
  await readFile(
    new URL("../packages/ui-common/src/lib/oidc.ts", import.meta.url),
    "utf8",
  )
)
  .replace(
    /import \{ publicConfig \} from ["']\.\.\/runtime-config\.js["'];/,
    "const publicConfig = { authOrigin: 'https://auth.example.test', apiAudience: 'https://api.example.test' };",
  )
  .replaceAll("import.meta.env.DEV", "false");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const oidc = await import(
  "data:text/javascript;base64," + Buffer.from(compiled).toString("base64")
);

test("user and admin logins on one origin keep separate PKCE state and request distinct scopes", async () => {
  const original = {
    window: globalThis.window,
    sessionStorage: globalThis.sessionStorage,
    fetch: globalThis.fetch,
  };
  const entries = new Map();
  const redirects = [];
  globalThis.sessionStorage = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: (key) => entries.delete(key),
  };
  globalThis.window = {
    location: { search: "", assign: (url) => redirects.push(new URL(url)) },
  };
  globalThis.fetch = async () =>
    Response.json({
      issuer: "https://auth.example.test/t/dev/oidc",
      authorization_endpoint: "https://auth.example.test/t/dev/oidc/auth",
    });
  const user = {
    issuer: "https://auth.example.test/t/dev/oidc",
    clientId: "gaegaeting-web",
    redirectUri: "https://ui.example.test/login",
  };
  const admin = {
    ...user,
    clientId: "gaegaeting-admin-web",
    redirectUri: "https://ui.example.test/admin/login",
  };
  try {
    await oidc.beginLogin(user);
    const userEntries = new Map(entries);
    await oidc.beginLogin(admin, {
      scopes: "openid profile email tenant_roles account:read account:write",
      prompt: "login",
    });
    assert.equal(entries.size, 6);
    for (const [key, value] of userEntries)
      assert.equal(entries.get(key), value);
    const [userUrl, adminUrl] = redirects;
    assert.equal(
      userUrl.searchParams.get("scope").includes("tenant_roles"),
      false,
    );
    assert.equal(
      adminUrl.searchParams.get("scope").includes("tenant_roles"),
      true,
    );
    assert.equal(
      adminUrl.searchParams.get("scope").includes("match:write"),
      false,
    );
    assert.equal(adminUrl.searchParams.get("redirect_uri"), admin.redirectUri);
    assert.equal(adminUrl.searchParams.get("prompt"), "login");
    assert.equal(adminUrl.searchParams.get("code_challenge_method"), "S256");
    assert.notEqual(
      adminUrl.searchParams.get("code_challenge"),
      userUrl.searchParams.get("code_challenge"),
    );
    window.location.search =
      "?code=opaque&state=" + userUrl.searchParams.get("state");
    await assert.rejects(oidc.completeLogin(admin), /state/);
    window.location.search =
      "?code=opaque&state=" + adminUrl.searchParams.get("state");
    await assert.rejects(oidc.completeLogin(user), /state/);
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
