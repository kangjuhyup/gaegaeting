import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '../../domain/model/role';
import { RoleRepositoryPort } from '../port/repository/role-repository.port';
import { TenantRepositoryPort } from '../port/repository/tenant-repository.port';
import { RoleServicePort, CreateRoleCommand } from '../port/role-service.port';
import { ulid } from 'ulid';

@Injectable()
export class RoleService extends RoleServicePort {
  constructor(
    private readonly roleRepo: RoleRepositoryPort,
    private readonly tenantRepo: TenantRepositoryPort,
  ) {
    super();
  }

  async createRole(command: CreateRoleCommand): Promise<Role> {
    // Tenant 존재 확인
    const tenant = await this.tenantRepo.findById({ tenantId: command.tenantId });
    if (!tenant) {
      throw new NotFoundException(`Tenant with id '${command.tenantId}' not found`);
    }

    // 도메인 모델 생성
    const role = Role.create({
      id: ulid(),
      tenantId: command.tenantId,
      code: command.code,
      name: command.name,
      description: command.description,
    });

    // Repository에 도메인 모델과 tenant 전달 (Repository에서 매핑 후 save)
    return await this.roleRepo.save(role, tenant);
  }

  async findById(roleId: string): Promise<Role | null> {
    return await this.roleRepo.findById(roleId);
  }

  async findByCode(tenantId: string, code: string): Promise<Role | null> {
    return await this.roleRepo.findByCode(tenantId, code);
  }

  async findByTenantId(tenantId: string, page: number, limit: number): Promise<{ items: Role[]; total: number }> {
    return await this.roleRepo.findByTenantId(tenantId, page, limit);
  }

  async update(role: Role): Promise<Role> {
    return await this.roleRepo.update(role);
  }

  async delete(roleId: string): Promise<void> {
    return await this.roleRepo.delete(roleId);
  }

  async assignRoleToUser(userId: string, roleId: string, clientId?: string): Promise<void> {
    return await this.roleRepo.assignRoleToUser(userId, roleId, clientId);
  }

  async removeRoleFromUser(userId: string, roleId: string, clientId?: string): Promise<void> {
    return await this.roleRepo.removeRoleFromUser(userId, roleId, clientId);
  }

  async getUserRoles(userId: string, clientId?: string): Promise<Role[]> {
    return await this.roleRepo.getUserRoles(userId, clientId);
  }
}

