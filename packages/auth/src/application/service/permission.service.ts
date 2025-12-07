import { Injectable, NotFoundException } from '@nestjs/common';
import { Permission } from '../../domain/model/permission';
import { PermissionRepositoryPort } from '../port/repository/permission-repository.port';
import { TenantRepositoryPort } from '../port/repository/tenant-repository.port';
import { PermissionServicePort, CreatePermissionCommand } from '../port/permission-service.port';
import { ulid } from 'ulid';

@Injectable()
export class PermissionService extends PermissionServicePort {
  constructor(
    private readonly permissionRepo: PermissionRepositoryPort,
    private readonly tenantRepo: TenantRepositoryPort,
  ) {
    super();
  }

  async createPermission(command: CreatePermissionCommand): Promise<Permission> {
    // Tenant 존재 확인
    const tenant = await this.tenantRepo.findById({ tenantId: command.tenantId });
    if (!tenant) {
      throw new NotFoundException(`Tenant with id '${command.tenantId}' not found`);
    }

    // 도메인 모델 생성
    const permission = Permission.create({
      id: ulid(),
      tenantId: command.tenantId,
      code: command.code,
      resource: command.resource,
      action: command.action,
      description: command.description,
    });

    // Repository에 도메인 모델과 tenant 전달 (Repository에서 매핑 후 save)
    return await this.permissionRepo.save(permission, tenant);
  }

  async findById(permissionId: string): Promise<Permission | null> {
    return await this.permissionRepo.findById(permissionId);
  }

  async findByCode(tenantId: string, code: string): Promise<Permission | null> {
    return await this.permissionRepo.findByCode(tenantId, code);
  }

  async findByTenantId(tenantId: string, resource?: string, page?: number, limit?: number): Promise<{ items: Permission[]; total: number }> {
    return await this.permissionRepo.findByTenantId(tenantId, resource, page, limit);
  }

  async update(permission: Permission): Promise<Permission> {
    return await this.permissionRepo.update(permission);
  }

  async delete(permissionId: string): Promise<void> {
    return await this.permissionRepo.delete(permissionId);
  }

  async assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    return await this.permissionRepo.assignPermissionToRole(roleId, permissionId);
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    return await this.permissionRepo.removePermissionFromRole(roleId, permissionId);
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    return await this.permissionRepo.getRolePermissions(roleId);
  }
}

