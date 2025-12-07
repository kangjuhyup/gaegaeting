import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PermissionUsecase, CreatePermissionInput, UpdatePermissionInput, PermissionDto, ListPermissionsQuery, PaginatedResult, AssignPermissionToRoleInput } from '../permission.usecase';
import { PermissionServicePort } from '../../port/permission-service.port';
import { Permission } from '@app/domain/model/permission';

@Injectable()
export class PermissionUsecaseImpl extends PermissionUsecase {
  constructor(
    private readonly permissionService: PermissionServicePort,
  ) {
    super();
  }

  async createPermission(input: CreatePermissionInput): Promise<PermissionDto> {
    // 중복 체크
    const existing = await this.permissionService.findByCode(input.tenantId, input.code);
    if (existing) {
      throw new ConflictException(`Permission with code ${input.code} already exists`);
    }

    // Service에서 도메인 모델 생성 및 저장
    const permission = await this.permissionService.createPermission({
      tenantId: input.tenantId,
      code: input.code,
      resource: input.resource,
      action: input.action,
      description: input.description,
    });

    return this.toDto(permission);
  }

  async getPermission(permissionId: string): Promise<PermissionDto | null> {
    const permission = await this.permissionService.findById(permissionId);
    if (!permission) return null;
    return this.toDto(permission);
  }

  async listPermissions(query: ListPermissionsQuery): Promise<PaginatedResult<PermissionDto>> {
    if (!query.tenantId) {
      return { items: [], total: 0, page: query.page, limit: query.limit };
    }

    const result = await this.permissionService.findByTenantId(
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
    const permission = await this.permissionService.findById(permissionId);
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    if (input.description !== undefined) {
      permission.updateDescription(input.description);
    }

    const updated = await this.permissionService.update(permission);
    return this.toDto(updated);
  }

  async deletePermission(permissionId: string): Promise<void> {
    const permission = await this.permissionService.findById(permissionId);
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    await this.permissionService.delete(permissionId);
  }

  async assignPermissionToRole(input: AssignPermissionToRoleInput): Promise<void> {
    const permission = await this.permissionService.findById(input.permissionId);
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    await this.permissionService.assignPermissionToRole(input.roleId, input.permissionId);
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    await this.permissionService.removePermissionFromRole(roleId, permissionId);
  }

  async getRolePermissions(roleId: string): Promise<PermissionDto[]> {
    const permissions = await this.permissionService.getRolePermissions(roleId);
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

