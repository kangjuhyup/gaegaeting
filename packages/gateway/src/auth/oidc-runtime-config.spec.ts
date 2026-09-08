import { resolveOidcRuntimeConfig } from './oidc-runtime-config.js';

describe('OIDC runtime configuration', () => {
  test('uses the production tenant issuer by default', () => {
    expect(resolveOidcRuntimeConfig({})).toEqual({
      issuer: 'https://auth.gaegaeting.app/t/gaegaeting/oidc',
      discoveryUrl:
        'https://auth.gaegaeting.app/t/gaegaeting/oidc/.well-known/openid-configuration',
      allowInsecureLoopbackHttp: false,
      insecureHttpAllowedHosts: [],
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
