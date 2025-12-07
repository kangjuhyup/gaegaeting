import { Role } from '../model/role';

export abstract class RoleRepositoryPort {
  abstract create(role: Role): Promise<Role>;
  abstract findById(id: string): Promise<Role | null>;
  abstract findByCode(tenantId: string, code: string): Promise<Role | null>;
  abstract findByTenantId(tenantId: string, page: number, limit: number): Promise<{ items: Role[]; total: number }>;
  abstract update(role: Role): Promise<Role>;
  abstract delete(id: string): Promise<void>;
  
  // Role-User 관계
  abstract assignRoleToUser(userId: string, roleId: string, clientId?: string): Promise<void>;
  abstract removeRoleFromUser(userId: string, roleId: string, clientId?: string): Promise<void>;
  abstract getUserRoles(userId: string, clientId?: string): Promise<Role[]>;
}

