import { resolveApiAudience, resolveOidcRuntimeConfig } from './oidc-runtime-config.js';

describe('OIDC runtime configuration', () => {
  test('preserves the existing issuer fallback outside production', () => {
    expect(resolveOidcRuntimeConfig({})).toEqual({
      issuer: 'https://auth.gaegaeting.app/t/gaegaeting/oidc',
      discoveryUrl:
        'https://auth.gaegaeting.app/t/gaegaeting/oidc/.well-known/openid-configuration',
      allowInsecureLoopbackHttp: false,
      insecureHttpAllowedHosts: [],
    });
  });

  test('requires an explicit issuer in production', () => {
    expect(() => resolveOidcRuntimeConfig({ NODE_ENV: 'production' }))
      .toThrow('OIDC_ISSUER is required in production');
  });

  test('accepts the proposed production issuer when explicitly configured', () => {
    const issuer = 'https://auth.rvkang.app/t/gaegaeting/oidc';
    expect(resolveOidcRuntimeConfig({ NODE_ENV: 'production', OIDC_ISSUER: issuer }))
      .toMatchObject({
        issuer,
        discoveryUrl: `${issuer}/.well-known/openid-configuration`,
      });
  });

  test('allows explicitly enabled loopback HTTP outside production', () => {
    const issuer = 'http://localhost:3000/t/gaegaeting/oidc';

    expect(resolveOidcRuntimeConfig({
      NODE_ENV: 'development',
      OIDC_ISSUER: issuer,
      OIDC_ALLOW_INSECURE_HTTP: 'true',
    })).toEqual({
      issuer,
      discoveryUrl: `${issuer}/.well-known/openid-configuration`,
      allowInsecureLoopbackHttp: true,
      insecureHttpAllowedHosts: [],
    });
  });

  test('allows only explicitly listed Compose hosts outside production', () => {
    const resolved = resolveOidcRuntimeConfig({
      NODE_ENV: 'development',
      OIDC_ALLOW_INSECURE_HTTP: 'true',
      OIDC_INSECURE_HTTP_ALLOWED_HOSTS:
        ' auth-service-integration,auth-service-integration ',
    });

    expect(resolved.insecureHttpAllowedHosts).toEqual([
      'auth-service-integration',
    ]);
  });

  test('never enables insecure HTTP in production', () => {
    expect(resolveOidcRuntimeConfig({
      NODE_ENV: 'production',
      OIDC_ISSUER: 'http://localhost:3000/t/gaegaeting/oidc',
      OIDC_ALLOW_INSECURE_HTTP: 'true',
    })).toMatchObject({
      allowInsecureLoopbackHttp: false,
      insecureHttpAllowedHosts: [],
    });
  });
});


describe('resource audience isolation', () => {
  test('uses the explicitly configured dev audience', () => {
    expect(resolveApiAudience({ OIDC_API_AUDIENCE: 'https://api-dev.gaegaeting.app' }))
      .toBe('https://api-dev.gaegaeting.app');
    expect(resolveApiAudience({})).toBe('https://api.gaegaeting.app');
  });
  test('rejects credential-bearing or insecure resource URLs', () => {
    expect(() => resolveApiAudience({ OIDC_API_AUDIENCE: 'http://api.test' })).toThrow();
    expect(() => resolveApiAudience({ OIDC_API_AUDIENCE: 'https://user:password@api.test' })).toThrow();
  });
});
