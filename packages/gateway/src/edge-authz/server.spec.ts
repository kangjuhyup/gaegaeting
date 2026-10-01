import { once } from 'node:events';
import { jest } from '@jest/globals';
import { EDGE_ASSERTION_HEADER, verifyEdgeAssertion } from '../auth/edge-assertion.js';
import { AuthServiceUnavailableError, InactiveTokenError } from '../auth/introspection-client.js';
import { createEdgeAuthzServer } from './server.js';

const secret = 'edge-only-test-secret-that-is-long-enough';

async function withServer(
  introspect: (token: string) => Promise<any>,
  check: (base: string) => Promise<void>,
) {
  const server = createEdgeAuthzServer({ introspect }, secret);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test address');
  try { await check(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
}

describe('Envoy external authorization endpoint', () => {
  test('introspects a valid opaque bearer and returns a Gateway-only assertion', async () => {
    const introspect = jest.fn(async () => ({
      issuer: 'https://auth.example/t/gaegaeting/oidc',
      tenantId: 'tenant-gaegaeting', subject: 'auth-subject', scopes: ['account:read'],
      issuedAt: 1, expiresAt: Math.floor(Date.now() / 1000) + 300,
    }));
    await withServer(introspect, async (base) => {
      const response = await fetch(`${base}/gateway/graphql`, {
        method: 'POST', headers: { authorization: 'Bearer opaque-token' },
      });
      expect(response.status).toBe(200);
      expect(verifyEdgeAssertion(response.headers.get(EDGE_ASSERTION_HEADER)!, 'opaque-token', secret))
        .toMatchObject({ subject: 'auth-subject' });
      expect(introspect).toHaveBeenCalledWith('opaque-token');
    });
  });

  test.each([
    ['inactive token', new InactiveTokenError(), 401],
    ['Auth unavailable', new AuthServiceUnavailableError(), 503],
  ])('fails closed for %s', async (_reason, error, status) => {
    await withServer(async () => { throw error; }, async (base) => {
      const response = await fetch(`${base}/gateway/graphql`, {
        method: 'POST', headers: { authorization: 'Bearer opaque-token' },
      });
      expect(response.status).toBe(status);
      expect(response.headers.get(EDGE_ASSERTION_HEADER)).toBeNull();
    });
  });

  test('rejects missing bearer without contacting Auth and permits browser preflight', async () => {
    const introspect = jest.fn();
    await withServer(introspect as any, async (base) => {
      expect((await fetch(`${base}/gateway/graphql`, { method: 'POST' })).status).toBe(401);
      expect((await fetch(`${base}/gateway/graphql`, { method: 'OPTIONS' })).status).toBe(200);
      expect(introspect).not.toHaveBeenCalled();
    });
  });
});
