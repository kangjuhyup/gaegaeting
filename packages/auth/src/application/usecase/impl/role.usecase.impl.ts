import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { RoleUsecase, CreateRoleInput, UpdateRoleInput, RoleDto, ListRolesQuery, PaginatedResult, AssignRoleToUserInput } from '../role.usecase';
import { ulid } from 'ulid';
import { RoleRepositoryPort } from '@app/domain/port/role-repository.port';
import { Role } from '@app/domain/model/role';

@Injectable()
export class RoleUsecaseImpl extends RoleUsecase {
  constructor(
    private readonly roleRepo: RoleRepositoryPort,
  ) {
    super();
  }

  async createRole(input: CreateRoleInput): Promise<RoleDto> {
    // 중복 체크
    const existing = await this.roleRepo.findByCode(input.tenantId, input.code);
    if (existing) {
      throw new ConflictException(`Role with code ${input.code} already exists`);
    }

    const role = Role.create({
      id: ulid(),
      tenantId: input.tenantId,
      code: input.code,
      name: input.name,
      description: input.description,
    });

    const saved = await this.roleRepo.create(role);
    return this.toDto(saved);
  }

  async getRole(roleId: string): Promise<RoleDto | null> {
    const role = await this.roleRepo.findById(roleId);
    if (!role) return null;
    return this.toDto(role);
  }

  async listRoles(query: ListRolesQuery): Promise<PaginatedResult<RoleDto>> {
    if (!query.tenantId) {
      return { items: [], total: 0, page: query.page, limit: query.limit };
    }

    const result = await this.roleRepo.findByTenantId(query.tenantId, query.page, query.limit);
    return {
      items: result.items.map((r) => this.toDto(r)),
      total: result.total,
      page: query.page,
      limit: query.limit,
    };
  }

  async updateRole(roleId: string, input: UpdateRoleInput): Promise<RoleDto> {
    const role = await this.roleRepo.findById(roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (input.name !== undefined) {
      role.updateName(input.name);
    }
    if (input.description !== undefined) {
      role.updateDescription(input.description);
    }

    const updated = await this.roleRepo.update(role);
    return this.toDto(updated);
  }

  async deleteRole(roleId: string): Promise<void> {
    const role = await this.roleRepo.findById(roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    await this.roleRepo.delete(roleId);
  }

  async assignRoleToUser(input: AssignRoleToUserInput): Promise<void> {
    const role = await this.roleRepo.findById(input.roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    await this.roleRepo.assignRoleToUser(input.userId, input.roleId, input.clientId);
  }

  async removeRoleFromUser(userId: string, roleId: string, clientId?: string): Promise<void> {
    await this.roleRepo.removeRoleFromUser(userId, roleId, clientId);
  }

  async getUserRoles(userId: string, clientId?: string): Promise<RoleDto[]> {
    const roles = await this.roleRepo.getUserRoles(userId, clientId);
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

