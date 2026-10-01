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
  if (environment.NODE_ENV === 'production' && !environment.OIDC_ISSUER?.trim()) {
    throw new Error('OIDC_ISSUER is required in production');
  }
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

/** Resource audiences are configured per environment and never inferred from a token. */
export function resolveApiAudience(environment: OidcRuntimeEnvironment): string {
  const audience = environment.OIDC_API_AUDIENCE ?? 'https://api.gaegaeting.app';
  const url = new URL(audience);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search) {
    throw new Error('OIDC_API_AUDIENCE must be an HTTPS resource URL');
  }
  return audience;
}
