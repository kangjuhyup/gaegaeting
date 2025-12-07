import { Tenant } from '../../../domain/model/tenant';

export interface FindTenantByIdQuery {
  tenantId: string;
}

export interface FindTenantByCodeQuery {
  code: string;
}

export interface FindTenantsQuery {
  search?: string;
  skip: number;
  take: number;
}

export interface FindTenantsResult {
  tenants: Tenant[];
  total: number;
}

export abstract class TenantRepositoryPort {
  abstract save(tenant: Tenant): Promise<Tenant>;
  abstract findById(query: FindTenantByIdQuery): Promise<Tenant | null>;
  abstract findByCode(query: FindTenantByCodeQuery): Promise<Tenant | null>;
  abstract findMany(query: FindTenantsQuery): Promise<FindTenantsResult>;
  abstract update(tenant: Tenant): Promise<Tenant>;
  abstract delete(tenantId: string): Promise<void>;
  abstract existsByCode(code: string): Promise<boolean>;
}

