import { Injectable } from '@nestjs/common';

export type IdpProvider = 'kakao' | 'naver' | 'google' | 'apple';

export interface CreateIdpInput {
  tenantId: string;
  provider: IdpProvider;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
}

export interface UpdateIdpInput {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  enabled?: boolean;
}

export interface IdpDto {
  id: string;
  tenantId: string;
  provider: IdpProvider;
  clientId: string;
  redirectUri: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListIdpsQuery {
  tenantId?: string;
  provider?: IdpProvider;
  enabled?: boolean;
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export abstract class IdentityProviderUsecase {
  abstract createIdp(input: CreateIdpInput): Promise<IdpDto>;
  abstract getIdp(idpId: string): Promise<IdpDto | null>;
  abstract getIdpByProvider(tenantId: string, provider: IdpProvider): Promise<IdpDto | null>;
  abstract listIdps(query: ListIdpsQuery): Promise<PaginatedResult<IdpDto>>;
  abstract updateIdp(idpId: string, input: UpdateIdpInput): Promise<IdpDto>;
  abstract deleteIdp(idpId: string): Promise<void>;
}

