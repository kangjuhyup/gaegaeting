import { Injectable } from '@nestjs/common';

export interface CreatePermissionInput {
  tenantId: string;
  code: string;
  resource?: string;
  action?: string;
  description?: string;
}

export interface UpdatePermissionInput {
  description?: string;
}

export interface PermissionDto {
  id: string;
  tenantId: string;
  code: string;
  resource?: string | null;
  action?: string | null;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignPermissionToRoleInput {
  roleId: string;
  permissionId: string;
}

export interface ListPermissionsQuery {
  tenantId?: string;
  resource?: string;
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
export abstract class PermissionUsecase {
  abstract createPermission(input: CreatePermissionInput): Promise<PermissionDto>;
  abstract getPermission(permissionId: string): Promise<PermissionDto | null>;
  abstract listPermissions(query: ListPermissionsQuery): Promise<PaginatedResult<PermissionDto>>;
  abstract updatePermission(permissionId: string, input: UpdatePermissionInput): Promise<PermissionDto>;
  abstract deletePermission(permissionId: string): Promise<void>;
  
  abstract assignPermissionToRole(input: AssignPermissionToRoleInput): Promise<void>;
  abstract removePermissionFromRole(roleId: string, permissionId: string): Promise<void>;
  abstract getRolePermissions(roleId: string): Promise<PermissionDto[]>;
}

