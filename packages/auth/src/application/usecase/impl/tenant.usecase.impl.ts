import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantConfigOrmEntity } from '@core/database';
import { TenantUsecase, CreateTenantInput, UpdateTenantInput, TenantDto, ListTenantsQuery, PaginatedResult, UpdateTenantConfigInput, TenantConfigDto } from '../tenant.usecase';
import { TenantRepositoryPort } from '../../../domain/port/tenant-repository.port';
import { Tenant } from '../../../domain/model/tenant';
import { ulid } from 'ulid';

@Injectable()
export class TenantUsecaseImpl implements TenantUsecase {
  constructor(
    private readonly tenantRepository: TenantRepositoryPort,
    @InjectRepository(TenantConfigOrmEntity)
    private readonly configRepo: Repository<TenantConfigOrmEntity>,
  ) {}

  async createTenant(input: CreateTenantInput): Promise<TenantDto> {
    // 코드 중복 확인
    const exists = await this.tenantRepository.existsByCode(input.code);
    if (exists) {
      throw new ConflictException(`Tenant with code '${input.code}' already exists`);
    }

    // 도메인 모델 생성
    const tenant = Tenant.create({
      id: ulid(),
      code: input.code,
      name: input.name,
    });

    // 저장
    const saved = await this.tenantRepository.create(tenant);

    // DTO 변환
    return this.toDto(saved);
  }

  async getTenant(tenantId: string): Promise<TenantDto | null> {
    const tenant = await this.tenantRepository.findById({ tenantId });
    if (!tenant) {
      return null;
    }
    return this.toDto(tenant);
  }

  async listTenants(query: ListTenantsQuery): Promise<PaginatedResult<TenantDto>> {
    const result = await this.tenantRepository.findMany({
      search: query.search,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      items: result.tenants.map((t) => this.toDto(t)),
      total: result.total,
      page: query.page,
      limit: query.limit,
    };
  }

  async updateTenant(tenantId: string, input: UpdateTenantInput): Promise<TenantDto> {
    const tenant = await this.tenantRepository.findById({ tenantId });
    if (!tenant) {
      throw new NotFoundException(`Tenant with id '${tenantId}' not found`);
    }

    // 이름 업데이트
    if (input.name !== undefined) {
      tenant.updateName(input.name);
    }

    // 저장
    const updated = await this.tenantRepository.update(tenant);

    return this.toDto(updated);
  }

  async deleteTenant(tenantId: string): Promise<void> {
    const tenant = await this.tenantRepository.findById({ tenantId });
    if (!tenant) {
      throw new NotFoundException(`Tenant with id '${tenantId}' not found`);
    }

    await this.tenantRepository.delete(tenantId);
  }

  async updateTenantConfig(tenantId: string, input: UpdateTenantConfigInput): Promise<TenantConfigDto> {
    // 테넌트 존재 확인
    const tenant = await this.tenantRepository.findById({ tenantId });
    if (!tenant) {
      throw new NotFoundException(`Tenant with id '${tenantId}' not found`);
    }

    // 기존 config 조회 또는 생성
    let config = await this.configRepo.findOne({ where: { tenantId } });
    
    if (!config) {
      // 기본값으로 생성
      config = this.configRepo.create({
        tenantId,
        signupPolicy: 'open',
        requirePhoneVerify: false,
        brandName: null,
        extra: null,
      });
    }

    // 업데이트
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

  async getTenantConfig(tenantId: string): Promise<TenantConfigDto | null> {
    const config = await this.configRepo.findOne({ where: { tenantId } });
    if (!config) {
      return null;
    }
    return this.configToDto(config);
  }

  private toDto(tenant: Tenant): TenantDto {
    return {
      id: tenant.id,
      code: tenant.code,
      name: tenant.name,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
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

