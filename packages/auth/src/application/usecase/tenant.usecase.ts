import { Injectable } from '@nestjs/common';

export interface CreateTenantInput {
  code: string;
  name: string;
}

export interface UpdateTenantInput {
  name?: string;
}

export interface TenantDto {
  id: string;
  code: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListTenantsQuery {
  page: number;
  limit: number;
  search?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface UpdateTenantConfigInput {
  signupPolicy?: 'invite' | 'open';
  requirePhoneVerify?: boolean;
  brandName?: string | null;
  extra?: Record<string, any> | null;
}

export interface TenantConfigDto {
  tenantId: string;
  signupPolicy: 'invite' | 'open';
  requirePhoneVerify: boolean;
  brandName?: string | null;
  extra?: Record<string, any> | null;
}

@Injectable()
export abstract class TenantUsecase {
  abstract createTenant(input: CreateTenantInput): Promise<TenantDto>;
  abstract getTenant(tenantId: string): Promise<TenantDto | null>;
  abstract listTenants(query: ListTenantsQuery): Promise<PaginatedResult<TenantDto>>;
  abstract updateTenant(tenantId: string, input: UpdateTenantInput): Promise<TenantDto>;
  abstract deleteTenant(tenantId: string): Promise<void>;
  abstract updateTenantConfig(tenantId: string, input: UpdateTenantConfigInput): Promise<TenantConfigDto>;
  abstract getTenantConfig(tenantId: string): Promise<TenantConfigDto | null>;
}

