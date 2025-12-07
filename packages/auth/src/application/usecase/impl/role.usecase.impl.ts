import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { RoleUsecase, CreateRoleInput, UpdateRoleInput, RoleDto, ListRolesQuery, PaginatedResult, AssignRoleToUserInput } from '../role.usecase';
import { RoleServicePort } from '../../port/role-service.port';
import { Role } from '@app/domain/model/role';

@Injectable()
export class RoleUsecaseImpl extends RoleUsecase {
  constructor(
    private readonly roleService: RoleServicePort,
  ) {
    super();
  }

  async createRole(input: CreateRoleInput): Promise<RoleDto> {
    // 중복 체크
    const existing = await this.roleService.findByCode(input.tenantId, input.code);
    if (existing) {
      throw new ConflictException(`Role with code ${input.code} already exists`);
    }

    // Service에서 도메인 모델 생성 및 저장
    const role = await this.roleService.createRole({
      tenantId: input.tenantId,
      code: input.code,
      name: input.name,
      description: input.description,
    });

    return this.toDto(role);
  }

  async getRole(roleId: string): Promise<RoleDto | null> {
    const role = await this.roleService.findById(roleId);
    if (!role) return null;
    return this.toDto(role);
  }

  async listRoles(query: ListRolesQuery): Promise<PaginatedResult<RoleDto>> {
    if (!query.tenantId) {
      return { items: [], total: 0, page: query.page, limit: query.limit };
    }

    const result = await this.roleService.findByTenantId(query.tenantId, query.page, query.limit);
    return {
      items: result.items.map((r) => this.toDto(r)),
      total: result.total,
      page: query.page,
      limit: query.limit,
    };
  }

  async updateRole(roleId: string, input: UpdateRoleInput): Promise<RoleDto> {
    const role = await this.roleService.findById(roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (input.name !== undefined) {
      role.updateName(input.name);
    }
    if (input.description !== undefined) {
      role.updateDescription(input.description);
    }

    const updated = await this.roleService.update(role);
    return this.toDto(updated);
  }

  async deleteRole(roleId: string): Promise<void> {
    const role = await this.roleService.findById(roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    await this.roleService.delete(roleId);
  }

  async assignRoleToUser(input: AssignRoleToUserInput): Promise<void> {
    const role = await this.roleService.findById(input.roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    await this.roleService.assignRoleToUser(input.userId, input.roleId, input.clientId);
  }

  async removeRoleFromUser(userId: string, roleId: string, clientId?: string): Promise<void> {
    await this.roleService.removeRoleFromUser(userId, roleId, clientId);
  }

  async getUserRoles(userId: string, clientId?: string): Promise<RoleDto[]> {
    const roles = await this.roleService.getUserRoles(userId, clientId);
    return roles.map((r) => this.toDto(r));
  }

  private toDto(role: Role): RoleDto {
    return {
      id: role.id,
      tenantId: role.tenantId,
      code: role.code,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}

