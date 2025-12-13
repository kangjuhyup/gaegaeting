import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantConfigOrmEntity } from '@core/database';
import { Tenant } from '../../domain/model/tenant';
import { TenantRepositoryPort } from '../port/repository/tenant-repository.port';
import { TenantServicePort, TenantConfigDto, FindTenantsQuery, CreateTenantCommand } from '../port/tenant-service.port';
import { ulid } from 'ulid';

@Injectable()
export class TenantService extends TenantServicePort {
  constructor(
    private readonly tenantRepo: TenantRepositoryPort,
    @InjectRepository(TenantConfigOrmEntity)
    private readonly configRepo: Repository<TenantConfigOrmEntity>,
  ) {
    super();
  }

  async createTenant(command: CreateTenantCommand): Promise<Tenant> {
    // 도메인 모델 생성
    const tenant = Tenant.create({
      id: ulid(),
      code: command.code,
      name: command.name,
    });

    // Repository에 도메인 모델 전달 (Repository에서 매핑 후 save)
    return await this.tenantRepo.save(tenant);
  }

  async findById(tenantId: string): Promise<Tenant | null> {
    return await this.tenantRepo.findById({ tenantId });
  }

  async findByCode(code: string): Promise<Tenant | null> {
    return await this.tenantRepo.findByCode({ code });
  }

  async findMany(query: FindTenantsQuery): Promise<{ tenants: Tenant[]; total: number }> {
    return await this.tenantRepo.findMany(query);
  }

  async update(tenant: Tenant): Promise<Tenant> {
    return await this.tenantRepo.update(tenant);
  }

  async delete(tenantId: string): Promise<void> {
    return await this.tenantRepo.delete(tenantId);
  }

  async existsByCode(code: string): Promise<boolean> {
    return await this.tenantRepo.existsByCode(code);
  }

  async getTenantConfig(tenantId: string): Promise<TenantConfigDto | null> {
    const config = await this.configRepo.findOne({ where: { tenantId } });
    if (!config) {
      return null;
    }
    return this.configToDto(config);
  }

  async updateTenantConfig(tenantId: string, input: Partial<TenantConfigDto>): Promise<TenantConfigDto> {
    let config = await this.configRepo.findOne({ where: { tenantId } });
    
    if (!config) {
      config = this.configRepo.create({
        tenantId,
        signupPolicy: 'open',
        requirePhoneVerify: false,
        brandName: null,
        extra: null,
      });
    }

    if (input.signupPolicy !== undefined) {
      config.signupPolicy = input.signupPolicy;
    }
    if (input.requirePhoneVerify !== undefined) {
      config.requirePhoneVerify = input.requirePhoneVerify;
    }
    if (input.brandName !== undefined) {
      config.brandName = input.brandName;
    }
    if (input.extra !== undefined) {
      config.extra = input.extra;
    }

    const saved = await this.configRepo.save(config);
    return this.configToDto(saved);
  }

  private configToDto(config: TenantConfigOrmEntity): TenantConfigDto {
    return {
      tenantId: config.tenantId,
      signupPolicy: config.signupPolicy,
      requirePhoneVerify: config.requirePhoneVerify,
      brandName: config.brandName ?? null,
      extra: config.extra ?? null,
    };
  }
}

