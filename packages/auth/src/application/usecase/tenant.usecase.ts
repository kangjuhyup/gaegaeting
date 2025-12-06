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

@Injectable()
export abstract class TenantUsecase {
  abstract createTenant(input: CreateTenantInput): Promise<TenantDto>;
  abstract getTenant(tenantId: string): Promise<TenantDto | null>;
  abstract listTenants(query: ListTenantsQuery): Promise<PaginatedResult<TenantDto>>;
  abstract updateTenant(tenantId: string, input: UpdateTenantInput): Promise<TenantDto>;
  abstract deleteTenant(tenantId: string): Promise<void>;
}

