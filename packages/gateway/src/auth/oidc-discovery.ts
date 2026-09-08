export interface OidcDiscovery {
  issuer: string;
  introspectionEndpoint: string;
}

export interface OidcDiscoveryOptions {
  allowInsecureLoopbackHttp?: boolean;
  allowedInsecureHttpHosts?: readonly string[];
}

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export class OidcDiscoveryCache {
  private cached?: Promise<OidcDiscovery>;

  constructor(
    private readonly discoveryUrl: string,
    private readonly expectedIssuer: string,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly options: OidcDiscoveryOptions = {},
  ) {}

  get(): Promise<OidcDiscovery> {
    this.cached ??= this.load().catch((error) => {
      this.cached = undefined;
      throw error;
    });
    return this.cached;
  }

  private async load(): Promise<OidcDiscovery> {
    try {
      const configured = new URL(this.discoveryUrl);
      const issuerUrl = new URL(this.expectedIssuer);
      if (
        !this.isAllowedUrl(configured) ||
        !this.isAllowedUrl(issuerUrl) ||
        configured.origin !== issuerUrl.origin
      ) {
        throw new Error();
      }

      const response = await this.fetchImpl(configured);
      if (!response.ok) throw new Error();
      const document = (await response.json()) as Record<string, unknown> | null;
      const issuer = document?.issuer;
      const introspectionEndpoint = document?.introspection_endpoint;
      const endpointUrl =
        typeof introspectionEndpoint === 'string'
          ? new URL(introspectionEndpoint)
          : undefined;
      if (
        issuer !== this.expectedIssuer ||
        !endpointUrl ||
        !this.isAllowedUrl(endpointUrl) ||
        endpointUrl.origin !== issuerUrl.origin
      ) {
        throw new Error();
      }
      return { issuer, introspectionEndpoint: endpointUrl.href };
    } catch {
      throw new Error('OIDC discovery unavailable');
    }
  }

  private isAllowedUrl(url: URL): boolean {
    if (url.protocol === 'https:') return true;
    const allowedHosts = new Set([
      'localhost',
      '127.0.0.1',
      '[::1]',
      ...(this.options.allowedInsecureHttpHosts ?? []).map((host) =>
        host.toLowerCase(),
      ),
    ]);
    return (
      url.protocol === 'http:' &&
      this.options.allowInsecureLoopbackHttp === true &&
      allowedHosts.has(url.hostname.toLowerCase())
    );
  }
}
