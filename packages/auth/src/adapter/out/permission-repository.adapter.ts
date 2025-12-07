import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionOrmEntity, TenantOrmEntity, RolePermissionOrmEntity } from '@core/database';
import { PermissionRepositoryPort } from '../../domain/port/permission-repository.port';
import { Permission } from '../../domain/model/permission';
import { PermissionMapper } from './mapper/permission.mapper';
import { ulid } from 'ulid';

@Injectable()
export class PermissionRepositoryAdapter implements PermissionRepositoryPort {
  constructor(
    @InjectRepository(PermissionOrmEntity)
    private readonly permissionRepo: Repository<PermissionOrmEntity>,
    @InjectRepository(TenantOrmEntity)
    private readonly tenantRepo: Repository<TenantOrmEntity>,
    @InjectRepository(RolePermissionOrmEntity)
    private readonly rolePermissionRepo: Repository<RolePermissionOrmEntity>,
  ) {}

  async create(permission: Permission): Promise<Permission> {
    const tenant = await this.tenantRepo.findOne({ where: { id: permission.tenantId } });
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const ormPermission = this.permissionRepo.create({
      id: permission.id || ulid(),
      tenant: { id: permission.tenantId } as TenantOrmEntity,
      code: permission.code,
      resource: permission.resource,
      action: permission.action,
      description: permission.description,
    });

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

