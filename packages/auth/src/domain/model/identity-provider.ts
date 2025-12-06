export type IdpProvider = 'kakao' | 'naver' | 'google' | 'apple';

export class IdentityProvider {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly provider: IdpProvider,
    public clientId: string,
    public clientSecret: string | null,
    public redirectUri: string,
    public enabled: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(params: {
    id: string;
    tenantId: string;
    provider: IdpProvider;
    clientId: string;
    clientSecret?: string;
    redirectUri: string;
  }): IdentityProvider {
    if (!params.clientId || params.clientId.length === 0) {
      throw new Error('Client ID is required');
    }
    if (!params.redirectUri || params.redirectUri.length === 0) {
      throw new Error('Redirect URI is required');
    }
    return new IdentityProvider(
      params.id,
      params.tenantId,
      params.provider,
      params.clientId,
      params.clientSecret ?? null,
      params.redirectUri,
      true,
      new Date(),
      new Date(),
    );
  }

  updateClientId(clientId: string): void {
    if (!clientId || clientId.length === 0) {
      throw new Error('Client ID cannot be empty');
    }
    this.clientId = clientId;
  }

  updateClientSecret(clientSecret: string | null): void {
    this.clientSecret = clientSecret;
  }

  updateRedirectUri(redirectUri: string): void {
    if (!redirectUri || redirectUri.length === 0) {
      throw new Error('Redirect URI cannot be empty');
    }
    this.redirectUri = redirectUri;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  hasSecret(): boolean {
    return this.clientSecret !== null && this.clientSecret.length > 0;
  }
}

