import { Role } from '../../domain/model/role';

export interface CreateRoleCommand {
  tenantId: string;
  code: string;
  name: string;
  description?: string;
}

export abstract class RoleServicePort {
  abstract createRole(command: CreateRoleCommand): Promise<Role>;
  abstract findById(roleId: string): Promise<Role | null>;
  abstract findByCode(tenantId: string, code: string): Promise<Role | null>;
  abstract findByTenantId(tenantId: string, page: number, limit: number): Promise<{ items: Role[]; total: number }>;
  abstract update(role: Role): Promise<Role>;
  abstract delete(roleId: string): Promise<void>;
  abstract assignRoleToUser(userId: string, roleId: string, clientId?: string): Promise<void>;
  abstract removeRoleFromUser(userId: string, roleId: string, clientId?: string): Promise<void>;
  abstract getUserRoles(userId: string, clientId?: string): Promise<Role[]>;
}

