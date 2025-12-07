import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionOrmEntity, RolePermissionOrmEntity } from '@core/database';
import { PermissionRepositoryPort } from '../../../application/port/repository/permission-repository.port';
import { Permission } from '../../../domain/model/permission';
import { Tenant } from '../../../domain/model/tenant';
import { PermissionMapper } from '../mapper/permission.mapper';

@Injectable()
export class PermissionRepositoryAdapter implements PermissionRepositoryPort {
  constructor(
    @InjectRepository(PermissionOrmEntity)
    private readonly permissionRepo: Repository<PermissionOrmEntity>,
    @InjectRepository(RolePermissionOrmEntity)
    private readonly rolePermissionRepo: Repository<RolePermissionOrmEntity>,
  ) {}

  async save(permission: Permission, tenant: Tenant): Promise<Permission> {
    // 도메인 모델을 ORM 엔티티로 매핑 (Service에서 조회한 tenant 사용)
    const ormPermission = this.permissionRepo.create(
      PermissionMapper.toOrm(permission, tenant),
    );

    // save만 수행
    const saved = await this.permissionRepo.save(ormPermission);
    return PermissionMapper.toDomain(saved);
  }


  async findById(id: string): Promise<Permission | null> {
    const permission = await this.permissionRepo.findOne({
      where: { id },
      relations: ['tenant'],
    });
    if (!permission) return null;
    return PermissionMapper.toDomain(permission);
  }

  async findByCode(tenantId: string, code: string): Promise<Permission | null> {
    const permission = await this.permissionRepo.findOne({
      where: { tenant: { id: tenantId }, code },
      relations: ['tenant'],
    });
    if (!permission) return null;
    return PermissionMapper.toDomain(permission);
  }

  async findByTenantId(tenantId: string, resource?: string, page: number = 1, limit: number = 20): Promise<{ items: Permission[]; total: number }> {
    const where: any = { tenant: { id: tenantId } };
    if (resource) {
      where.resource = resource;
    }

    const [items, total] = await this.permissionRepo.findAndCount({
      where,
      relations: ['tenant'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      items: items.map((p) => PermissionMapper.toDomain(p)),
      total,
    };
  }

  async update(permission: Permission): Promise<Permission> {
    const existing = await this.permissionRepo.findOne({
      where: { id: permission.id },
      relations: ['tenant'],
    });
    if (!existing) {
      throw new Error('Permission not found');
    }

    existing.description = permission.description;
    const saved = await this.permissionRepo.save(existing);
    return PermissionMapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    const permission = await this.permissionRepo.findOne({ where: { id } });
    if (!permission) {
      throw new Error('Permission not found');
    }
    await this.permissionRepo.remove(permission);
  }

  async assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    const existing = await this.rolePermissionRepo.findOne({
      where: { roleId, permissionId },
    });

    if (existing) {
      return; // 이미 할당됨
    }

    const rolePermission = this.rolePermissionRepo.create({
      roleId,
      permissionId,
    });

    await this.rolePermissionRepo.save(rolePermission);
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    await this.rolePermissionRepo.delete({
      roleId,
      permissionId,
    });
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const rolePermissions = await this.rolePermissionRepo.find({
      where: { roleId },
      relations: ['permission', 'permission.tenant'],
    });

    return rolePermissions.map((rp) => PermissionMapper.toDomain(rp.permission));
  }
}

