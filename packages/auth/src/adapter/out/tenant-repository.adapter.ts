import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { TenantOrmEntity, TenantConfigOrmEntity } from '@core/database';
import {
  TenantRepositoryPort,
  FindTenantByIdQuery,
  FindTenantByCodeQuery,
  FindTenantsQuery,
  FindTenantsResult,
} from '../../domain/port/tenant-repository.port';
import { Tenant } from '../../domain/model/tenant';
import { TenantMapper } from './mapper/tenant.mapper';

@Injectable()
export class TenantRepositoryAdapter implements TenantRepositoryPort {
  constructor(
    @InjectRepository(TenantOrmEntity)
    private readonly tenantRepo: Repository<TenantOrmEntity>,
    @InjectRepository(TenantConfigOrmEntity)
    private readonly configRepo: Repository<TenantConfigOrmEntity>,
  ) {}

  async create(tenant: Tenant): Promise<Tenant> {
    const ormTenant = this.tenantRepo.create(TenantMapper.toOrm(tenant));
    const saved = await this.tenantRepo.save(ormTenant);
    return TenantMapper.toDomain(saved);
  }

  async findById(query: FindTenantByIdQuery): Promise<Tenant | null> {
    const tenant = await this.tenantRepo.findOne({
      where: { id: query.tenantId },
    });
    if (!tenant) return null;
    return TenantMapper.toDomain(tenant);
  }

  async findByCode(query: FindTenantByCodeQuery): Promise<Tenant | null> {
    const tenant = await this.tenantRepo.findOne({
      where: { code: query.code },
    });
    if (!tenant) return null;
    return TenantMapper.toDomain(tenant);
  }

  async findMany(query: FindTenantsQuery): Promise<FindTenantsResult> {
    const where: any = {};

    if (query.search) {
      where.name = Like(`%${query.search}%`);
    }

    const [items, total] = await this.tenantRepo.findAndCount({
      where,
      skip: query.skip,
      take: query.take,
      order: { createdAt: 'DESC' },
    });

    return {
      tenants: items.map((t) => TenantMapper.toDomain(t)),
      total,
    };
  }

  async update(tenant: Tenant): Promise<Tenant> {
    const existing = await this.tenantRepo.findOne({
      where: { id: tenant.id },
    });
    if (!existing) {
      throw new Error('Tenant not found');
    }

    const updated = this.tenantRepo.merge(existing, TenantMapper.toOrm(tenant));
    const saved = await this.tenantRepo.save(updated);
    return TenantMapper.toDomain(saved);
  }

  async delete(tenantId: string): Promise<void> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    await this.tenantRepo.remove(tenant);
  }

  async existsByCode(code: string): Promise<boolean> {
    const count = await this.tenantRepo.count({
      where: { code },
    });
    return count > 0;
  }
}

