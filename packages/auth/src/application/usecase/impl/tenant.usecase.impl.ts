import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { TenantUsecase, CreateTenantInput, UpdateTenantInput, TenantDto, ListTenantsQuery, PaginatedResult, UpdateTenantConfigInput, TenantConfigDto } from '../tenant.usecase';
import { TenantServicePort } from '../../port/tenant-service.port';
import { Tenant } from '../../../domain/model/tenant';

@Injectable()
export class TenantUsecaseImpl implements TenantUsecase {
  constructor(
    private readonly tenantService: TenantServicePort,
  ) {}

  async createTenant(input: CreateTenantInput): Promise<TenantDto> {
    // 코드 중복 확인
    const exists = await this.tenantService.existsByCode(input.code);
    if (exists) {
      throw new ConflictException(`Tenant with code '${input.code}' already exists`);
    }

    // Service에서 도메인 모델 생성 및 저장
    const tenant = await this.tenantService.createTenant({
      code: input.code,
      name: input.name,
    });

    // DTO 변환
    return this.toDto(tenant);
  }

  async getTenant(tenantId: string): Promise<TenantDto | null> {
    const tenant = await this.tenantService.findById(tenantId);
    if (!tenant) {
      return null;
    }
    return this.toDto(tenant);
  }

  async listTenants(query: ListTenantsQuery): Promise<PaginatedResult<TenantDto>> {
    const result = await this.tenantService.findMany({
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
    const tenant = await this.tenantService.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant with id '${tenantId}' not found`);
    }

    // 이름 업데이트
    if (input.name !== undefined) {
      tenant.updateName(input.name);
    }

    // 저장
    const updated = await this.tenantService.update(tenant);

    return this.toDto(updated);
  }

  async deleteTenant(tenantId: string): Promise<void> {
    const tenant = await this.tenantService.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant with id '${tenantId}' not found`);
    }

    await this.tenantService.delete(tenantId);
  }

  async updateTenantConfig(tenantId: string, input: UpdateTenantConfigInput): Promise<TenantConfigDto> {
    // 테넌트 존재 확인
    const tenant = await this.tenantService.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant with id '${tenantId}' not found`);
    }

    return await this.tenantService.updateTenantConfig(tenantId, input);
  }

  async getTenantConfig(tenantId: string): Promise<TenantConfigDto | null> {
    return await this.tenantService.getTenantConfig(tenantId);
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
}

