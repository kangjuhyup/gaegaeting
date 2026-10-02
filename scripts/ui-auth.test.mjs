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

function browser(fetchImpl, appConfig = config, appSession = session) {
  const storage = new Map([
    ['gaegaeting.oidc.gaegaeting-web.verifier', 'test-verifier'],
    ['gaegaeting.oidc.gaegaeting-web.state', 'test-state'],
    ['gaegaeting.oidc.gaegaeting-web.nonce', 'test-nonce'],
    ['gaegaeting.oidc.gaegaeting-web.logout-state', 'stale-logout-state'],
    ['unrelated', 'keep'],
  ]);
  const redirects = [];
  const original = { window: globalThis.window, sessionStorage: globalThis.sessionStorage, fetch: globalThis.fetch };
  globalThis.fetch = fetchImpl;
  globalThis.sessionStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  globalThis.window = {
    location: { origin: 'https://ui.example.test', href: appConfig.redirectUri, assign: (url) => redirects.push(url) },
    open() { throw new Error('Logout must not open another window'); },
    confirm() { throw new Error('Logout must not display an app confirmation'); },
  };
  return {
    logout() { return this.run(() => oidc.beginLogout(appConfig, appSession)); },
    async run(action) {
      try { return await action(); }
      finally {
        for (const [key, value] of Object.entries(original)) {
          if (value === undefined) delete globalThis[key];
          else globalThis[key] = value;
        }
      }
    }, storage, redirects,
  };
}

test('SSO logout revokes the token then uses the current window with the ID hint, exact callback and fresh state', async () => {
  const calls = [];
  const app = browser(async (url, options) => {
    calls.push({ url, options });
    return options ? new Response(null, { status: 200 }) : Response.json(metadata);
  });
  await app.logout();
  assert.deepEqual([...app.storage.keys()].sort(), ['gaegaeting.oidc.gaegaeting-web.logout-state', 'unrelated']);
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
  const state = redirect.searchParams.get('state');
  assert.match(state, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(state, 'stale-logout-state');
  assert.equal(app.storage.get('gaegaeting.oidc.gaegaeting-web.logout-state'), state);
  assert.equal(app.storage.get('unrelated'), 'keep');
});

test('SSO logout still redirects to Auth when revocation is not advertised', async () => {
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

test('SSO logout without an ID hint or with a foreign callback stops before contacting Auth', async () => {
  for (const [appConfig, appSession] of [
    [config, { ...session, idToken: '' }],
    [{ ...config, postLogoutRedirectUri: 'https://another-app.example/' }, session],
  ]) {
    const app = browser(async () => { assert.fail('Auth must not be contacted'); }, appConfig, appSession);
    await assert.rejects(app.logout());
    assert.equal(app.redirects.length, 0);
    assert.deepEqual([...app.storage], [['unrelated', 'keep']]);
  }
});

test('a matching logout callback completes once and a replay is rejected', async () => {
  const app = browser(async () => Response.json({ ...metadata, revocation_endpoint: undefined }));
  await app.run(async () => {
    await oidc.beginLogout(config, session);
    const state = new URL(app.redirects[0]).searchParams.get('state');
    window.location.href = config.postLogoutRedirectUri + '?state=' + state;
    assert.equal(oidc.completeLogout(config), true);
    assert.deepEqual([...app.storage], [['unrelated', 'keep']]);
    assert.throws(() => oidc.completeLogout(config), /state/);
  });
});

test('missing, incorrect or duplicated logout state cannot be accepted as a logout callback', async () => {
  for (const query of ['', '?state=incorrect', '?state=expected&state=expected']) {
    const app = browser(() => assert.fail('Logout callback needs no request'));
    await app.run(() => {
      app.storage.set('gaegaeting.oidc.gaegaeting-web.logout-state', 'expected');
      window.location.href = config.postLogoutRedirectUri + query;
      assert.throws(() => oidc.completeLogout(config), /state/);
      assert.equal(app.storage.has('gaegaeting.oidc.gaegaeting-web.logout-state'), false);
    });
  }
});

test('a callback cannot use another client state or complete at a different origin or path', async () => {
  const app = browser(() => assert.fail('Logout callback needs no request'));
  await app.run(() => {
    const adminKey = 'gaegaeting.oidc.gaegaeting-admin-web.logout-state';
    app.storage.set(adminKey, 'admin-state');
    for (const uri of ['https://other.example/', 'https://ui.example.test/profile']) {
      window.location.href = uri + '?state=stale-logout-state';
      assert.equal(oidc.completeLogout(config), false);
      assert.equal(app.storage.get('gaegaeting.oidc.gaegaeting-web.logout-state'), 'stale-logout-state');
    }
    window.location.href = config.postLogoutRedirectUri + '?state=admin-state';
    assert.throws(() => oidc.completeLogout(config), /state/);
    assert.equal(app.storage.get(adminKey), 'admin-state');
  });
});

test('ordinary navigation and login callbacks are not mistaken for logout completion', async () => {
  const app = browser(() => assert.fail('Logout callback needs no request'));
  await app.run(() => {
    app.storage.delete('gaegaeting.oidc.gaegaeting-web.logout-state');
    window.location.href = config.postLogoutRedirectUri;
    assert.equal(oidc.completeLogout(config), false);
    for (const query of ['?code=login-code&state=login-state', '?error=access_denied&state=login-state']) {
      window.location.href = config.redirectUri + query;
      assert.equal(oidc.completeLogout(config), false);
      assert.equal(app.storage.get('gaegaeting.oidc.gaegaeting-web.state'), 'test-state');
    }
  });
});

test('starting a new login clears only that client pending logout state', async () => {
  const app = browser(async () => Response.json({ ...metadata, authorization_endpoint: config.issuer + '/auth' }));
  await app.run(async () => {
    const adminKey = 'gaegaeting.oidc.gaegaeting-admin-web.logout-state';
    app.storage.set(adminKey, 'admin-state');
    await oidc.beginLogin(config);
    assert.equal(app.storage.has('gaegaeting.oidc.gaegaeting-web.logout-state'), false);
    assert.equal(app.storage.get(adminKey), 'admin-state');
  });
});

test('failed current-window navigation leaves no pending logout callback', async () => {
  const app = browser(async () => Response.json({ ...metadata, revocation_endpoint: undefined }));
  await app.run(async () => {
    window.location.assign = () => { throw new Error('navigation failed'); };
    await assert.rejects(oidc.beginLogout(config, session), /navigation failed/);
    assert.deepEqual([...app.storage], [['unrelated', 'keep']]);
  });
});

test('the registered callback query is preserved and altered callback parameters are rejected', async () => {
  const appConfig = { ...config, postLogoutRedirectUri: config.postLogoutRedirectUri + '?return=hello%20world&view=login' };
  for (const changeQuery of [false, true]) {
    const app = browser(async () => Response.json({ ...metadata, revocation_endpoint: undefined }), appConfig);
    await app.run(async () => {
      await oidc.beginLogout(appConfig, session);
      const request = new URL(app.redirects[0]);
      assert.equal(request.searchParams.get('post_logout_redirect_uri'), appConfig.postLogoutRedirectUri);
      const callback = new URL(appConfig.postLogoutRedirectUri);
      callback.searchParams.set('state', request.searchParams.get('state'));
      if (changeQuery) callback.searchParams.set('return', 'another-page');
      window.location.href = callback.href;
      if (changeQuery) assert.throws(() => oidc.completeLogout(appConfig), /state/);
      else assert.equal(oidc.completeLogout(appConfig), true);
    });
  }
});
