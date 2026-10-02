import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bootstrapGaegaetingAuth, desiredClients } from './bootstrap-gaegaeting-auth.mjs';

const env = {
  AUTH_BASE_URL: 'http://localhost:3010', AUTH_ADMIN_USERNAME: 'admin', AUTH_ADMIN_PASSWORD: 'test-only',
  GAEGAETING_WEB_REDIRECT_URI: 'http://localhost:5173/login',
  GAEGAETING_INTERACTION_URL: 'http://localhost:5173/interaction',
  GAEGAETING_INTROSPECTION_CLIENT_SECRET: 'a'.repeat(32),
  GAEGAETING_PROVISIONING_CLIENT_SECRET: 'b'.repeat(32),
};

test('Gaegaeting bootstrap keeps login, API inspection and provisioning clients separate', () => {
  const clients = desiredClients(env);
  assert.deepEqual(clients.map(client => client.clientId), [
    'gaegaeting-web', 'gaegaeting-api', 'gaegaeting-account-provisioner',
  ]);
  assert.equal(clients[0].externalInteractionUiUrl, 'http://localhost:5173/interaction');
  assert.ok(clients[0].scope.split(' ').includes('tenant_roles'));
  assert.equal(clients[2].scope, 'auth.user.provision');
  assert.equal(clients[1].introspectionResources[0], 'https://api.gaegaeting.app');
});

test('Gaegaeting bootstrap never changes Vote and stops on a conflicting existing client', async () => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, method: init.method ?? 'GET' });
    if (url.endsWith('/admin/session')) return new Response('{}', { headers: { 'set-cookie': 'admin_session=test; HttpOnly' } });
    if (url.includes('/admin/tenants?')) return Response.json({ items: [{ code: 'gaegaeting' }, { code: 'e-vote' }] });
    if (url.includes('/admin/scopes?')) return Response.json({ items: ['offline_access', 'account:read', 'account:write', 'match:read', 'match:write', 'auth.user.provision', 'tenant_roles'].map(name => ({ name, enabled: true })) });
    if (url.includes('/admin/clients?')) return Response.json({ items: [{ clientId: 'gaegaeting-web', enabled: true, type: 'public' }] });
    throw new Error(`Unexpected request: ${url}`);
  };
  await assert.rejects(bootstrapGaegaetingAuth({ env, fetchImpl }), /Auth client conflict: gaegaeting-web/);
  assert.equal(calls.some(call => call.url.includes('e-vote')), false);
  assert.equal(calls.some(call => call.method === 'PUT'), false);
});


test('dev client resource restrictions remain separate from production', () => {
  const clients = desiredClients({ ...env, OIDC_API_AUDIENCE: 'https://api-dev.gaegaeting.app' });
  assert.deepEqual(clients[0].allowedResources, ['https://api-dev.gaegaeting.app']);
  assert.deepEqual(clients[1].introspectionResources, ['https://api-dev.gaegaeting.app']);
});

test('bootstrap refuses a tenant owned by another project before any request', async () => {
  await assert.rejects(bootstrapGaegaetingAuth({ env: { ...env, AUTH_TENANT_CODE: 'e-vote' },
    fetchImpl: () => { throw new Error('must not fetch'); } }), /Only Gaegaeting tenants/);
});
