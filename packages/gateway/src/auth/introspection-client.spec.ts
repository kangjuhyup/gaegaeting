import { jest } from '@jest/globals';
import {
  AuthServiceUnavailableError,
  InactiveTokenError,
  OpaqueTokenIntrospector,
} from './introspection-client.js';

const issuer = 'https://auth.gaegaeting.app/t/gaegaeting/oidc';
const audience = 'https://api.gaegaeting.app';
const now = 1_800_000_000;

function active(overrides: Record<string, unknown> = {}) {
  return {
    active: true,
    iss: issuer,
    aud: audience,
    tenant_id: 'tenant-gaegaeting',
    sub: 'central-subject',
    exp: now + 300,
    iat: now - 10,
    scope: 'openid profile',
    ...overrides,
  };
}

function makeClient(response: unknown, responseStatus = 200) {
  const fetchImpl = jest.fn().mockResolvedValue({
    ok: responseStatus >= 200 && responseStatus < 300,
    status: responseStatus,
    json: async () => response,
  });
  const discovery = {
    get: jest.fn().mockResolvedValue({
      issuer,
      introspectionEndpoint: `${issuer}/introspection`,
    }),
  };
  return {
    fetchImpl,
    client: new OpaqueTokenIntrospector(discovery, fetchImpl as any, {
      clientId: 'gaegaeting-api',
      clientSecret: 'x'.repeat(40),
      expectedIssuer: issuer,
      expectedAudience: audience,
      timeoutMs: 2_000,
      now: () => now,
    }),
  };
}

describe('OpaqueTokenIntrospector', () => {
  test.each([[audience], [[audience]]])(
    'accepts the exact API audience in string or array form',
    async (aud) => {
      const { client } = makeClient(active({ aud }));
      await expect(client.introspect('opaque-value')).resolves.toEqual({
        tenantId: 'tenant-gaegaeting',
        subject: 'central-subject',
        scopes: ['openid', 'profile'],
        issuedAt: now - 10,
        expiresAt: now + 300,
      });
    },
  );

  test.each([
    ['inactive', { active: false }],
    ['wrong issuer', active({ iss: 'https://auth.invalid/t/other/oidc' })],
    ['wrong audience', active({ aud: 'https://wrong.invalid' })],
    ['mixed audience', active({ aud: [audience, 'https://wrong.invalid'] })],
    ['expired', active({ exp: now })],
    ['future nbf', active({ nbf: now + 1 })],
    ['future iat', active({ iat: now + 1 })],
    ['missing tenant', active({ tenant_id: '' })],
    ['missing subject', active({ sub: '' })],
  ])('rejects %s as an inactive token', async (_label, response) => {
    const { client } = makeClient(response);
    await expect(client.introspect('opaque-value')).rejects.toBeInstanceOf(
      InactiveTokenError,
    );
  });

  test.each([
    ['non-success status', active(), 500],
    ['malformed response', null, 200],
  ])('classifies %s as unavailable', async (_label, response, status) => {
    const { client } = makeClient(response, status);
    await expect(client.introspect('opaque-value')).rejects.toBeInstanceOf(
      AuthServiceUnavailableError,
    );
  });

  test('uses form encoding and Basic client authentication without returning credentials', async () => {
    const { client, fetchImpl } = makeClient(active());
    await client.introspect('opaque-value');
    const init = fetchImpl.mock.calls[0][1];

    expect(init.method).toBe('POST');
    expect(init.headers['content-type']).toBe('application/x-www-form-urlencoded');
    expect(init.headers.authorization).toMatch(/^Basic /);
    expect(String(init.body)).toBe('token=opaque-value&token_type_hint=access_token');
  });
});
