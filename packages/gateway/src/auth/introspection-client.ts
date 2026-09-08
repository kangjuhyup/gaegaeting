import type { FetchLike, OidcDiscoveryCache } from './oidc-discovery.js';

export class InactiveTokenError extends Error {
  constructor() {
    super('Authentication required');
  }
}

export class AuthServiceUnavailableError extends Error {
  constructor() {
    super('Authentication service unavailable');
  }
}

export interface ExternalPrincipal {
  tenantId: string;
  subject: string;
  scopes: string[];
  issuedAt: number;
  expiresAt: number;
}

export interface IntrospectionOptions {
  clientId: string;
  clientSecret: string;
  expectedIssuer: string;
  expectedAudience: string;
  timeoutMs: number;
  now?: () => number;
}

export class OpaqueTokenIntrospector {
  constructor(
    private readonly discovery: Pick<OidcDiscoveryCache, 'get'>,
    private readonly fetchImpl: FetchLike,
    private readonly options: IntrospectionOptions,
  ) {}

  async introspect(token: string): Promise<ExternalPrincipal> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const discovery = await this.discovery.get();
      const body = new URLSearchParams({
        token,
        token_type_hint: 'access_token',
      });
      const response = await this.fetchImpl(discovery.introspectionEndpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          authorization: `Basic ${Buffer.from(
            `${this.options.clientId}:${this.options.clientSecret}`,
            'utf8',
          ).toString('base64')}`,
        },
        body,
        signal: controller.signal,
      });
      if (!response.ok) throw new AuthServiceUnavailableError();
      return this.validate(await response.json());
    } catch (error) {
      if (error instanceof InactiveTokenError) throw error;
      if (error instanceof AuthServiceUnavailableError) throw error;
      throw new AuthServiceUnavailableError();
    } finally {
      clearTimeout(timeout);
    }
  }

  private validate(value: unknown): ExternalPrincipal {
    if (!value || typeof value !== 'object') throw new AuthServiceUnavailableError();
    const response = value as Record<string, unknown>;
    if (response.active !== true) throw new InactiveTokenError();

    const now = (this.options.now ?? (() => Math.floor(Date.now() / 1000)))();
    const audiences = Array.isArray(response.aud) ? response.aud : [response.aud];
    const exactAudience =
      audiences.length > 0 &&
      audiences.every((audience) => audience === this.options.expectedAudience);
    const validNumber = (candidate: unknown): candidate is number =>
      typeof candidate === 'number' && Number.isFinite(candidate);

    if (
      response.iss !== this.options.expectedIssuer ||
      !exactAudience ||
      !validNumber(response.exp) ||
      response.exp <= now ||
      !validNumber(response.iat) ||
      response.iat > now ||
      (response.nbf !== undefined &&
        (!validNumber(response.nbf) || response.nbf > now)) ||
      typeof response.tenant_id !== 'string' ||
      response.tenant_id.trim() === '' ||
      typeof response.sub !== 'string' ||
      response.sub.trim() === '' ||
      (response.scope !== undefined && typeof response.scope !== 'string')
    ) {
      throw new InactiveTokenError();
    }

    return {
      tenantId: response.tenant_id,
      subject: response.sub,
      scopes: typeof response.scope === 'string'
        ? response.scope.split(/\s+/).filter(Boolean)
        : [],
      issuedAt: response.iat,
      expiresAt: response.exp,
    };
  }
}
