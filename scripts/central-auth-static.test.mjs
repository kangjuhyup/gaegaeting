import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const assertMissing = async (path) => {
  await assert.rejects(
    access(new URL(path, root)),
    (error) => error?.code === 'ENOENT',
    `legacy auth artifact still exists: ${path}`,
  );
};

test('keeps the canonical issuer, discovery URL and origin audience', async () => {
  const [gateway, runtimeConfig] = await Promise.all([
    read('packages/gateway/src/main.ts'),
    read('packages/gateway/src/auth/oidc-runtime-config.ts'),
  ]);
  assert.match(runtimeConfig, /https:\/\/auth\.gaegaeting\.app\/t\/gaegaeting\/oidc/);
  assert.match(gateway, /resolveOidcRuntimeConfig\(process\.env\)/);
  assert.match(gateway, /https:\/\/api\.gaegaeting\.app/);
});

test('keeps the legacy auth workspace out of the application', async () => {
  await assertMissing('packages/auth/package.json');
  await assertMissing('docs/auth/swagger-spec.json');
  const gateway = await read('packages/gateway/src/gateway.ts');
  const lockfile = await read('pnpm-lock.yaml');
  assert.doesNotMatch(gateway, /name: 'auth'/);
  assert.doesNotMatch(lockfile, /^  packages\/auth:/m);
});

test('has no production JWT secret or unsigned-header authentication fallback', async () => {
  const files = await Promise.all([
    read('packages/account/src/app.module.ts'),
    read('packages/match/src/app.module.ts'),
    read('packages/core/auth/src/guard/access.guard.ts'),
    read('packages/core/auth/src/guard/graphql-access.guard.ts'),
    read('packages/gateway/src/auth/introspection-client.ts'),
  ]);
  const source = files.join('\n');
  assert.doesNotMatch(source, /JWT_SECRET|excludeAuth|x-jwt-payload/);
});
