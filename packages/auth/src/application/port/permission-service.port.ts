import { Permission } from '../../domain/model/permission';

export interface CreatePermissionCommand {
  tenantId: string;
  code: string;
  resource?: string;
  action?: string;
  description?: string;
}

export abstract class PermissionServicePort {
  abstract createPermission(command: CreatePermissionCommand): Promise<Permission>;
  abstract findById(permissionId: string): Promise<Permission | null>;
  abstract findByCode(tenantId: string, code: string): Promise<Permission | null>;
  abstract findByTenantId(tenantId: string, resource?: string, page?: number, limit?: number): Promise<{ items: Permission[]; total: number }>;
  abstract update(permission: Permission): Promise<Permission>;
  abstract delete(permissionId: string): Promise<void>;
  abstract assignPermissionToRole(roleId: string, permissionId: string): Promise<void>;
  abstract removePermissionFromRole(roleId: string, permissionId: string): Promise<void>;
  abstract getRolePermissions(roleId: string): Promise<Permission[]>;
}

