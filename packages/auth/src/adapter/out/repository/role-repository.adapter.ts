import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleOrmEntity, UserRoleOrmEntity, RolePermissionOrmEntity } from '@core/database';
import { RoleRepositoryPort } from '../../../application/port/repository/role-repository.port';
import { Role } from '../../../domain/model/role';
import { RoleMapper } from '../mapper/role.mapper';
import { Tenant } from '@app/domain/model/tenant';

@Injectable()
export class RoleRepositoryAdapter implements RoleRepositoryPort {
  constructor(
    @InjectRepository(RoleOrmEntity)
    private readonly roleRepo: Repository<RoleOrmEntity>,
    @InjectRepository(UserRoleOrmEntity)
    private readonly userRoleRepo: Repository<UserRoleOrmEntity>,
    @InjectRepository(RolePermissionOrmEntity)
    private readonly rolePermissionRepo: Repository<RolePermissionOrmEntity>,
  ) {}

  async save(role: Role, tenant: Tenant): Promise<Role> {
    // 도메인 모델을 ORM 엔티티로 매핑 (Service에서 조회한 tenant 사용)
    const ormRole = this.roleRepo.create(
      RoleMapper.toOrm(role, tenant),
    );

    // save만 수행
    const saved = await this.roleRepo.save(ormRole);
    return RoleMapper.toDomain(saved);
  }

  async findById(id: string): Promise<Role | null> {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: ['tenant'],
    });
    if (!role) return null;
    return RoleMapper.toDomain(role);
  }

  async findByCode(tenantId: string, code: string): Promise<Role | null> {
    const role = await this.roleRepo.findOne({
      where: { tenant: { id: tenantId }, code },
      relations: ['tenant'],
    });
    if (!role) return null;
    return RoleMapper.toDomain(role);
  }

  async findByTenantId(tenantId: string, page: number, limit: number): Promise<{ items: Role[]; total: number }> {
    const [items, total] = await this.roleRepo.findAndCount({
      where: { tenant: { id: tenantId } },
      relations: ['tenant'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      items: items.map((r) => RoleMapper.toDomain(r)),
      total,
    };
  }

  async update(role: Role): Promise<Role> {
    const existing = await this.roleRepo.findOne({
      where: { id: role.id },
      relations: ['tenant'],
    });
    if (!existing) {
      throw new Error('Role not found');
    }

    existing.name = role.name;
    existing.description = role.description;
    const saved = await this.roleRepo.save(existing);
    return RoleMapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) {
      throw new Error('Role not found');
    }
    await this.roleRepo.remove(role);
  }

  async assignRoleToUser(userId: string, roleId: string, clientId?: string): Promise<void> {
    const existing = await this.userRoleRepo.findOne({
      where: { userId, roleId, clientId: clientId || null },
    });

    if (existing) {
      return; // 이미 할당됨
    }

    const userRole = this.userRoleRepo.create({
      userId,
      roleId,
      clientId: clientId || null,
    });

    await this.userRoleRepo.save(userRole);
  }

  async removeRoleFromUser(userId: string, roleId: string, clientId?: string): Promise<void> {
    await this.userRoleRepo.delete({
      userId,
      roleId,
      clientId: clientId || null,
    });
  }

  async getUserRoles(userId: string, clientId?: string): Promise<Role[]> {
    const userRoles = await this.userRoleRepo.find({
      where: {
        userId,
        ...(clientId !== undefined && { clientId: clientId || null }),
      },
      relations: ['role', 'role.tenant'],
    });

    return userRoles.map((ur) => RoleMapper.toDomain(ur.role));
  }
}

