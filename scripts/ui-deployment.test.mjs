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

test('public shared user interaction allowlist keeps web plus native while admin stays isolated', () => {
  assert.deepEqual(readPublicConfig(env).interactionClientIds, ['gaegaeting-web', 'gaegaeting-mobile']);
  assert.equal(readPublicConfig(env).clientId, 'gaegaeting-web');
  const admin = readPublicConfig({ ...env, UI_APP: 'admin', UI_OIDC_CLIENT_ID: 'gaegaeting-admin-web' });
  assert.deepEqual(admin.interactionClientIds, ['gaegaeting-admin-web']);
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
    for (const route of ['/login?code=opaque', '/interaction?uid=opaque', '/signup', '/likes', '/chats', '/chats/sample-room_1', '/storyboard']) {
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
    for (const route of ['/chats/', '/chats/room/extra', '/chats/.env', '/chats/%2Fetc', '/chats/' + 'a'.repeat(129)]) {
      assert.equal((await fetch(base + route)).status, 404, route);
    }
    const head = await fetch(base + '/chats/sample-room_1', { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    assert.equal((await fetch(`${base}/health`)).status, 200);
    assert.equal((await fetch(`${base}/`, { method: 'POST' })).status, 405);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});

test('photo storage is a single explicit HTTPS origin and never reveals credentials', async () => {
  const photoEnv = { ...env, UI_IMAGE_STORAGE_ORIGIN: 'https://storage.example.test' };
  const config = readPublicConfig(photoEnv);
  assert.equal(config.imageStorageOrigin, 'https://storage.example.test');
  for (const origin of ['http://storage.example.test', 'https://user:secret@storage.example.test', 'https://storage.example.test/private', 'https://storage.example.test?secret=value']) {
    assert.throws(() => readPublicConfig({ ...env, UI_IMAGE_STORAGE_ORIGIN: origin }));
  }
  const root = await mkdtemp(join(tmpdir(), 'gaegaeting-ui-photos-'));
  await writeFile(join(root, 'index.html'), '<div>UI</div>');
  const server = createUiServer(config, root);
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/profile`);
    assert.equal(res.status, 200);
    const csp = res.headers.get('content-security-policy');
    assert.match(csp, /img-src 'self' data: blob: https:\/\/storage.example.test;/);
    assert.match(csp, /connect-src [^;]*https:\/\/storage.example.test;/);
    assert.doesNotMatch(csp, /\*/);
  } finally {
    await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true, force: true });
  }
});

test('independent admin app serves only its /admin routes and assets using its own client', async () => {
  const adminEnv = { ...env, UI_APP: 'admin', UI_OIDC_CLIENT_ID: 'gaegaeting-admin-web' };
  assert.throws(() => readPublicConfig({ ...env, UI_APP: 'admin' }), /own UI_OIDC_CLIENT_ID/);
  assert.throws(() => readPublicConfig({ ...adminEnv, UI_OIDC_CLIENT_ID: 'gaegaeting-web' }), /own UI_OIDC_CLIENT_ID/);
  assert.throws(() => readPublicConfig({ ...env, UI_APP: 'unknown' }), /Invalid UI_APP/);
  const config = readPublicConfig(adminEnv);
  assert.equal(config.basePath, '/admin');
  const root = await mkdtemp(join(tmpdir(), 'gaegaeting-admin-'));
  await writeFile(join(root, 'index.html'), '<div>ADMIN</div>');
  await writeFile(join(root, 'entry.js'), 'admin asset');
  const server = createUiServer(config, root);
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const route of ['/admin', '/admin/', '/admin/login?code=opaque', '/admin/interaction?uid=opaque', '/admin/image-review', '/admin/health']) {
      assert.equal((await fetch(base + route)).status, 200, route);
    }
    const runtime = await (await fetch(base + '/admin/config.js')).text();
    assert.match(runtime, /"basePath":"\/admin"/);
    assert.match(runtime, /"clientId":"gaegaeting-admin-web"/);
    assert.equal(await (await fetch(base + '/admin/entry.js')).text(), 'admin asset');
    for (const route of ['/', '/login', '/config.js', '/administrator', '/admin/signup', '/admin/profile', '/admin/pet', '/admin/likes', '/admin/chats', '/admin/chats/sample-room_1', '/admin/storyboard']) {
      assert.equal((await fetch(base + route)).status, 404, route);
    }
  } finally {
    await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true, force: true });
  }
});

test('user app no longer exposes the administrator routes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gaegaeting-user-'));
  await writeFile(join(root, 'index.html'), '<div>USER</div>');
  const server = createUiServer(readPublicConfig(env), root);
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const route of ['/image-review', '/admin', '/admin/login']) assert.equal((await fetch(base + route)).status, 404);
    assert.equal((await fetch(base + '/profile')).status, 200);
    assert.equal((await fetch(base + '/pet')).status, 200);
  } finally {
    await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true, force: true });
  }
});
