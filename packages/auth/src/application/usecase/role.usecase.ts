import { Injectable } from '@nestjs/common';

export interface CreateRoleInput {
  tenantId: string;
  code: string;
  name: string;
  description?: string;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
}

export interface RoleDto {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignRoleToUserInput {
  userId: string;
  roleId: string;
  clientId?: string;
}

export interface ListRolesQuery {
  tenantId?: string;
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
export abstract class RoleUsecase {
  abstract createRole(input: CreateRoleInput): Promise<RoleDto>;
  abstract getRole(roleId: string): Promise<RoleDto | null>;
  abstract listRoles(query: ListRolesQuery): Promise<PaginatedResult<RoleDto>>;
  abstract updateRole(roleId: string, input: UpdateRoleInput): Promise<RoleDto>;
  abstract deleteRole(roleId: string): Promise<void>;
  
  abstract assignRoleToUser(input: AssignRoleToUserInput): Promise<void>;
  abstract removeRoleFromUser(userId: string, roleId: string, clientId?: string): Promise<void>;
  abstract getUserRoles(userId: string, clientId?: string): Promise<RoleDto[]>;
}

