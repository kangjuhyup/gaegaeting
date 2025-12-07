import { Permission } from '../model/permission';

export abstract class PermissionRepositoryPort {
  abstract create(permission: Permission): Promise<Permission>;
  abstract findById(id: string): Promise<Permission | null>;
  abstract findByCode(tenantId: string, code: string): Promise<Permission | null>;
  abstract findByTenantId(tenantId: string, resource?: string, page?: number, limit?: number): Promise<{ items: Permission[]; total: number }>;
  abstract update(permission: Permission): Promise<Permission>;
  abstract delete(id: string): Promise<void>;
  
  // Role-Permission 관계
  abstract assignPermissionToRole(roleId: string, permissionId: string): Promise<void>;
  abstract removePermissionFromRole(roleId: string, permissionId: string): Promise<void>;
  abstract getRolePermissions(roleId: string): Promise<Permission[]>;
}

