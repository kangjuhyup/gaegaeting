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

const config = {
  issuer: 'https://auth.example.test/t/dev/oidc',
  clientId: 'gaegaeting-web',
  redirectUri: 'https://ui.example.test/login',
  postLogoutRedirectUri: 'https://ui.example.test/',
};
const session = { accessToken: 'test-access-token', idToken: 'test-id-token' };
const metadata = {
  issuer: config.issuer,
  end_session_endpoint: `${config.issuer}/session/end`,
  revocation_endpoint: `${config.issuer}/token/revocation`,
};

  function browser(fetchImpl) {
  const storage = new Map([
    ['gaegaeting.oidc.gaegaeting-web.verifier', 'test-verifier'],
    ['gaegaeting.oidc.gaegaeting-web.state', 'test-state'],
    ['gaegaeting.oidc.gaegaeting-web.nonce', 'test-nonce'],
    ['unrelated', 'keep'],
  ]);
  const redirects = [];
  const original = { window: globalThis.window, sessionStorage: globalThis.sessionStorage, fetch: globalThis.fetch };
  globalThis.fetch = fetchImpl;
  globalThis.sessionStorage = { removeItem: (key) => storage.delete(key) };
  globalThis.window = { location: { assign: (url) => redirects.push(url) } };
  return {
    async logout() {
      try { await oidc.beginLogout(config, session); }
      finally {
        for (const [key, value] of Object.entries(original)) {
          if (value === undefined) delete globalThis[key];
          else globalThis[key] = value;
        }
      }
    }, storage, redirects,
  };
}

test('logout revokes the public client token and returns to the registered login page', async () => {
  const calls = [];
  const app = browser(async (url, options) => {
    calls.push({ url, options });
    return options ? new Response(null, { status: 200 }) : Response.json(metadata);
  });
  await app.logout();
  assert.deepEqual([...app.storage], [['unrelated', 'keep']]);
  assert.equal(calls[1].url, 'https://auth.example.test/t/dev/oidc/token/revocation');
  assert.equal(calls[1].options.method, 'POST');
  assert.deepEqual(Object.fromEntries(calls[1].options.body), {
    token: session.accessToken, token_type_hint: 'access_token', client_id: config.clientId,
  });
  const redirect = new URL(app.redirects[0]);
  assert.equal(redirect.origin, 'https://auth.example.test');
  assert.equal(redirect.pathname, '/t/dev/oidc/session/end');
  assert.equal(redirect.searchParams.get('id_token_hint'), session.idToken);
  assert.equal(redirect.searchParams.get('post_logout_redirect_uri'), config.postLogoutRedirectUri);
  assert.equal(redirect.searchParams.get('client_id'), config.clientId);
  assert.equal(redirect.searchParams.has('access_token'), false);
});

test('logout still ends the provider session when revocation is not advertised', async () => {
  const app = browser(async () => Response.json({ ...metadata, revocation_endpoint: undefined }));
  await app.logout();
  assert.equal(app.redirects.length, 1);
});

test('an unavailable provider cannot leave pending login credentials behind', async () => {
  const app = browser(async () => { throw new Error('offline'); });
  await assert.rejects(app.logout(), /offline/);
  assert.deepEqual([...app.storage], [['unrelated', 'keep']]);
  assert.equal(app.redirects.length, 0);
});

test('logout rejects an issuer mismatch or missing logout endpoint', async () => {
  for (const discovery of [
    { ...metadata, issuer: 'https://another-issuer.example' },
    { ...metadata, end_session_endpoint: undefined },
  ]) {
    const app = browser(async () => Response.json(discovery));
    await assert.rejects(app.logout());
    assert.equal(app.redirects.length, 0);
  }
});

test('logout never sends credentials to endpoints outside the issuer origin', async () => {
  for (const field of ['end_session_endpoint', 'revocation_endpoint']) {
    let requests = 0;
    const app = browser(async () => {
      requests += 1;
      return Response.json({ ...metadata, [field]: 'https://another-issuer.example/logout' });
    });
    await assert.rejects(app.logout(), /올바르지 않습니다/);
    assert.equal(requests, 1);
    assert.equal(app.redirects.length, 0);
  }
});

test('token revocation failure is reported without claiming provider logout succeeded', async () => {
  const app = browser(async (_url, options) => options
    ? new Response(null, { status: 503 }) : Response.json(metadata));
  await assert.rejects(app.logout(), /HTTP 503/);
  assert.equal(app.redirects.length, 0);
  assert.deepEqual([...app.storage], [['unrelated', 'keep']]);
});
