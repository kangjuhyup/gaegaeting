import { jest } from '@jest/globals';
import { OidcDiscoveryCache } from './oidc-discovery.js';

const issuer = 'https://auth.gaegaeting.app/t/gaegaeting/oidc';
const discoveryUrl = `${issuer}/.well-known/openid-configuration`;

test('loads and caches the tenant introspection endpoint', async () => {
  const fetchImpl = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ issuer, introspection_endpoint: `${issuer}/introspection` }),
  });
  const discovery = new OidcDiscoveryCache(discoveryUrl, issuer, fetchImpl as any);
  await expect(discovery.get()).resolves.toEqual({
    issuer,
    introspectionEndpoint: `${issuer}/introspection`,
  });
  await discovery.get();
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test.each([
  ['wrong issuer', { issuer: 'https://auth.gaegaeting.app/t/other/oidc', introspection_endpoint: `${issuer}/introspection` }],
  ['cross-origin endpoint', { issuer, introspection_endpoint: 'https://attacker.invalid/introspection' }],
  ['insecure endpoint', { issuer, introspection_endpoint: 'http://auth.gaegaeting.app/introspection' }],
])('rejects %s metadata', async (_label, document) => {
  const discovery = new OidcDiscoveryCache(
    discoveryUrl,
    issuer,
    jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => document }) as any,
  );
  await expect(discovery.get()).rejects.toThrow('OIDC discovery unavailable');
});

test('loads a loopback HTTP issuer when explicitly enabled', async () => {
  const localIssuer = 'http://localhost:3000/t/gaegaeting/oidc';
  const localDiscovery = `${localIssuer}/.well-known/openid-configuration`;
  const fetchImpl = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      issuer: localIssuer,
      introspection_endpoint: `${localIssuer}/introspection`,
    }),
  });

  await expect(new OidcDiscoveryCache(
    localDiscovery,
    localIssuer,
    fetchImpl as any,
    { allowInsecureLoopbackHttp: true },
  ).get()).resolves.toEqual({
    issuer: localIssuer,
    introspectionEndpoint: `${localIssuer}/introspection`,
  });
});

test('loads an explicitly allowlisted Compose HTTP issuer', async () => {
  const localIssuer =
    'http://auth-service-integration:3000/t/gaegaeting/oidc';
  const fetchImpl = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      issuer: localIssuer,
      introspection_endpoint: `${localIssuer}/introspection`,
    }),
  });

  await expect(
    new OidcDiscoveryCache(
      `${localIssuer}/.well-known/openid-configuration`,
      localIssuer,
      fetchImpl as any,
      {
        allowInsecureLoopbackHttp: true,
        allowedInsecureHttpHosts: ['auth-service-integration'],
      },
    ).get(),
  ).resolves.toEqual({
    issuer: localIssuer,
    introspectionEndpoint: `${localIssuer}/introspection`,
  });
});

test.each([
  ['disabled loopback HTTP', 'http://localhost:3000', false],
  ['non-loopback HTTP', 'http://auth-service:3000', true],
])('rejects %s discovery', async (_label, origin, allowInsecureLoopbackHttp) => {
  const localIssuer = `${origin}/t/gaegaeting/oidc`;
  const discovery = new OidcDiscoveryCache(
    `${localIssuer}/.well-known/openid-configuration`,
    localIssuer,
    jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        issuer: localIssuer,
        introspection_endpoint: `${localIssuer}/introspection`,
      }),
    }) as any,
    { allowInsecureLoopbackHttp },
  );

  await expect(discovery.get()).rejects.toThrow('OIDC discovery unavailable');
});

test('rejects a cross-origin HTTP introspection endpoint in local mode', async () => {
  const localIssuer = 'http://localhost:3000/t/gaegaeting/oidc';
  const discovery = new OidcDiscoveryCache(
    `${localIssuer}/.well-known/openid-configuration`,
    localIssuer,
    jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        issuer: localIssuer,
        introspection_endpoint: 'http://127.0.0.1:3000/introspection',
      }),
    }) as any,
    { allowInsecureLoopbackHttp: true },
  );

  await expect(discovery.get()).rejects.toThrow('OIDC discovery unavailable');
});
