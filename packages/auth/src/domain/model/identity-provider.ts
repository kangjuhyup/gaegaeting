import { PersistenceEntity } from '@core/model';

export type IdpProvider = 'kakao' | 'naver' | 'google' | 'apple';

interface IIdentityProvider {
  tenantId: string;
  provider: IdpProvider;
  clientId: string;
  clientSecret: string | null;
  redirectUri: string;
  enabled: boolean;
}

export class IdentityProvider extends PersistenceEntity<string, IIdentityProvider> {
  private constructor(param: IIdentityProvider, id?: string) {
    super(param, id);
  }

  static of(param: IIdentityProvider, id?: string): IdentityProvider {
    return new IdentityProvider(param, id);
  }

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
      {
        tenantId: params.tenantId,
        provider: params.provider,
        clientId: params.clientId,
        clientSecret: params.clientSecret ?? null,
        redirectUri: params.redirectUri,
        enabled: true,
      },
      params.id,
    );
  }

  get tenantId(): string {
    return this.etc.tenantId;
  }

  get provider(): IdpProvider {
    return this.etc.provider;
  }

  get clientId(): string {
    return this.etc.clientId;
  }

  get clientSecret(): string | null {
    return this.etc.clientSecret;
  }

  get redirectUri(): string {
    return this.etc.redirectUri;
  }

  get enabled(): boolean {
    return this.etc.enabled;
  }

  updateClientId(clientId: string): void {
    if (!clientId || clientId.length === 0) {
      throw new Error('Client ID cannot be empty');
    }
    this.etc.clientId = clientId;
  }

  updateClientSecret(clientSecret: string | null): void {
    this.etc.clientSecret = clientSecret;
  }

  updateRedirectUri(redirectUri: string): void {
    if (!redirectUri || redirectUri.length === 0) {
      throw new Error('Redirect URI cannot be empty');
    }
    this.etc.redirectUri = redirectUri;
  }

  enable(): void {
    this.etc.enabled = true;
  }

  disable(): void {
    this.etc.enabled = false;
  }

  isEnabled(): boolean {
    return this.etc.enabled;
  }

  hasSecret(): boolean {
    return this.etc.clientSecret !== null && this.etc.clientSecret.length > 0;
  }
}

