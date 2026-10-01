import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createUiServer, readPublicConfig } from '../deploy/docker/ui-server.mjs';

const env = {
  UI_API_AUDIENCE: 'https://api-dev.example.test',
  UI_OIDC_ISSUER: 'https://auth.example.test/t/gaegaeting/oidc',
  UI_ACCOUNT_GRAPHQL_URL: 'https://api.example.test/account/graphql',
  UI_GATEWAY_GRAPHQL_URL: 'https://api.example.test/gateway/graphql',
  AUTH_PROVISIONING_CLIENT_SECRET: 'must-never-be-public',
};

test('deployed UI requires HTTPS service addresses and exposes only public settings', () => {
  const config = readPublicConfig(env);
  assert.equal(config.tenantCode, 'gaegaeting');
  assert.equal(config.apiAudience, 'https://api-dev.example.test');
  assert.equal(config.authOrigin, 'https://auth.example.test');
  assert.equal(JSON.stringify(config).includes('must-never-be-public'), false);
  assert.throws(() => readPublicConfig({}), /required/);
  assert.throws(() => readPublicConfig({ ...env, UI_OIDC_ISSUER: 'http://localhost:3010' }), /HTTPS/);
  assert.throws(() => readPublicConfig({ ...env, UI_ACCOUNT_GRAPHQL_URL: 'https://user:password@example.test' }), /HTTPS/);
});

test('login callbacks and interaction routes serve the SPA with uncached config and secure headers', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gaegaeting-ui-'));
  await writeFile(join(root, 'index.html'), '<div>UI</div>');
  await writeFile(join(root, '.env'), 'must-not-serve');
  await symlink('/etc/passwd', join(root, 'outside.txt'));
  const server = createUiServer(readPublicConfig(env), root);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const route of ['/login?code=opaque', '/interaction?uid=opaque', '/signup']) {
      const res = await fetch(`${base}${route}`);
      assert.equal(res.status, 200);
      assert.equal(await res.text(), '<div>UI</div>');
      assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
      assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    }
    const config = await fetch(`${base}/config.js`);
    assert.equal(config.headers.get('cache-control'), 'no-store');
    assert.match(await config.text(), /https:\/\/auth.example.test/);
    assert.equal((await fetch(`${base}/assets/missing.js`)).status, 404);
    assert.equal((await fetch(`${base}/%2eenv`)).status, 404);
    assert.equal((await fetch(`${base}/outside.txt`)).status, 404);
    assert.equal((await fetch(`${base}/assets/%2e%2e/%2e%2e/etc/passwd`)).status, 404);
    assert.equal((await fetch(`${base}/health`)).status, 200);
    assert.equal((await fetch(`${base}/`, { method: 'POST' })).status, 405);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});
