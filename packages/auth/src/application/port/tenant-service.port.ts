import { Tenant } from '../../domain/model/tenant';

export type SignupPolicy = 'invite' | 'open';

export interface TenantConfigDto {
  tenantId: string;
  signupPolicy: SignupPolicy;
  requirePhoneVerify: boolean;
  brandName: string | null;
  extra: any | null;
}

export interface FindTenantsQuery {
  search?: string;
  skip: number;
  take: number;
}

export interface CreateTenantCommand {
  code: string;
  name: string;
}

export abstract class TenantServicePort {
  abstract createTenant(command: CreateTenantCommand): Promise<Tenant>;
  abstract findById(tenantId: string): Promise<Tenant | null>;
  abstract findByCode(code: string): Promise<Tenant | null>;
  abstract findMany(query: FindTenantsQuery): Promise<{ tenants: Tenant[]; total: number }>;
  abstract update(tenant: Tenant): Promise<Tenant>;
  abstract delete(tenantId: string): Promise<void>;
  abstract existsByCode(code: string): Promise<boolean>;
  abstract getTenantConfig(tenantId: string): Promise<TenantConfigDto | null>;
  abstract updateTenantConfig(tenantId: string, config: Partial<TenantConfigDto>): Promise<TenantConfigDto>;
}

