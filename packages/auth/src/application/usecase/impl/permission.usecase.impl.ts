import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PermissionUsecase, CreatePermissionInput, UpdatePermissionInput, PermissionDto, ListPermissionsQuery, PaginatedResult, AssignPermissionToRoleInput } from '../permission.usecase';
import { ulid } from 'ulid';
import { PermissionRepositoryPort } from '@app/domain/port/permission-repository.port';
import { Permission } from '@app/domain/model/permission';

@Injectable()
export class PermissionUsecaseImpl extends PermissionUsecase {
  constructor(
    private readonly permissionRepo: PermissionRepositoryPort,
  ) {
    super();
  }

  async createPermission(input: CreatePermissionInput): Promise<PermissionDto> {
    // 중복 체크
    const existing = await this.permissionRepo.findByCode(input.tenantId, input.code);
    if (existing) {
      throw new ConflictException(`Permission with code ${input.code} already exists`);
    }

    const permission = Permission.create({
      id: ulid(),
      tenantId: input.tenantId,
      code: input.code,
      resource: input.resource,
      action: input.action,
      description: input.description,
    });

    const saved = await this.permissionRepo.create(permission);
    return this.toDto(saved);
  }

  async getPermission(permissionId: string): Promise<PermissionDto | null> {
    const permission = await this.permissionRepo.findById(permissionId);
    if (!permission) return null;
    return this.toDto(permission);
  }

  async listPermissions(query: ListPermissionsQuery): Promise<PaginatedResult<PermissionDto>> {
    if (!query.tenantId) {
      return { items: [], total: 0, page: query.page, limit: query.limit };
    }

    const result = await this.permissionRepo.findByTenantId(
      query.tenantId,
      query.resource,
      query.page,
      query.limit,
    );

    return {
      items: result.items.map((p) => this.toDto(p)),
      total: result.total,
      page: query.page,
      limit: query.limit,
    };
  }

  async updatePermission(permissionId: string, input: UpdatePermissionInput): Promise<PermissionDto> {
    const permission = await this.permissionRepo.findById(permissionId);
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    if (input.description !== undefined) {
      permission.updateDescription(input.description);
    }

    const updated = await this.permissionRepo.update(permission);
    return this.toDto(updated);
  }

  async deletePermission(permissionId: string): Promise<void> {
    const permission = await this.permissionRepo.findById(permissionId);
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    await this.permissionRepo.delete(permissionId);
  }

  async assignPermissionToRole(input: AssignPermissionToRoleInput): Promise<void> {
    const permission = await this.permissionRepo.findById(input.permissionId);
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    await this.permissionRepo.assignPermissionToRole(input.roleId, input.permissionId);
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    await this.permissionRepo.removePermissionFromRole(roleId, permissionId);
  }

  async getRolePermissions(roleId: string): Promise<PermissionDto[]> {
    const permissions = await this.permissionRepo.getRolePermissions(roleId);
    return permissions.map((p) => this.toDto(p));
  }

  private toDto(permission: Permission): PermissionDto {
    return {
      id: permission.id,
      tenantId: permission.tenantId,
      code: permission.code,
      resource: permission.resource,
      action: permission.action,
      description: permission.description,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    };
  }
}

