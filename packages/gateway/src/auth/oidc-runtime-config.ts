const PRODUCTION_ISSUER =
  'https://auth.gaegaeting.app/t/gaegaeting/oidc';

export interface OidcRuntimeEnvironment {
  [name: string]: string | undefined;
  NODE_ENV?: string;
  OIDC_ISSUER?: string;
  OIDC_DISCOVERY_URL?: string;
  OIDC_ALLOW_INSECURE_HTTP?: string;
  OIDC_INSECURE_HTTP_ALLOWED_HOSTS?: string;
}

export interface OidcRuntimeConfig {
  issuer: string;
  discoveryUrl: string;
  allowInsecureLoopbackHttp: boolean;
  insecureHttpAllowedHosts: string[];
}

export function resolveOidcRuntimeConfig(
  environment: OidcRuntimeEnvironment,
): OidcRuntimeConfig {
  const issuer = environment.OIDC_ISSUER ?? PRODUCTION_ISSUER;
  const allowInsecureLoopbackHttp =
    environment.NODE_ENV !== 'production' &&
    environment.OIDC_ALLOW_INSECURE_HTTP === 'true';
  const insecureHttpAllowedHosts = allowInsecureLoopbackHttp
    ? Array.from(
        new Set(
          (environment.OIDC_INSECURE_HTTP_ALLOWED_HOSTS ?? '')
            .split(',')
            .map((host) => host.trim().toLowerCase())
            .filter((host) => /^[a-z0-9.-]+$/.test(host)),
        ),
      )
    : [];
  return {
    issuer,
    discoveryUrl:
      environment.OIDC_DISCOVERY_URL ??
      `${issuer}/.well-known/openid-configuration`,
    allowInsecureLoopbackHttp,
    insecureHttpAllowedHosts,
  };
}
