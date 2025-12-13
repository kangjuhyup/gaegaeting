import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiQuery, ApiParam } from '@nestjs/swagger';
import {
  CreateTenantBodyDto,
  UpdateTenantBodyDto,
  UpdateTenantConfigBodyDto,
  ListTenantsQueryDto,
  GetTenantParamDto,
  UpdateTenantParamDto,
  DeleteTenantParamDto,
  UpdateTenantConfigParamDto,
} from './dto/tenant.dto';
import { TenantUsecase } from '@app/application/usecase/tenant.usecase';

@ApiTags('Admin - Tenant')
@ApiBearerAuth('admin-token')
@Controller('admin/v1/tenants')
export class TenantAdminController {
  constructor(private readonly tenantUsecase: TenantUsecase) {}

  @Post()
  @ApiOperation({ summary: '테넌트 생성' })
  async createTenant(@Body() body: CreateTenantBodyDto) {
    return await this.tenantUsecase.createTenant({
      code: body.code,
      name: body.name,
    });
  }

  @Get()
  @ApiOperation({ summary: '테넌트 목록 조회' })
  async listTenants(@Query() query: ListTenantsQueryDto) {
    return await this.tenantUsecase.listTenants({
      page: query.page || 1,
      limit: query.limit || 20,
      search: query.search,
    });
  }

  @Get(':tenantId')
  @ApiOperation({ summary: '테넌트 상세 조회' })
  async getTenant(@Param() param: GetTenantParamDto) {
    const tenant = await this.tenantUsecase.getTenant(param.tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    return tenant;
  }

  @Put(':tenantId')
  @ApiOperation({ summary: '테넌트 수정' })
  async updateTenant(@Param() param: UpdateTenantParamDto, @Body() body: UpdateTenantBodyDto) {
    return await this.tenantUsecase.updateTenant(param.tenantId, {
      name: body.name,
    });
  }

  @Delete(':tenantId')
  @ApiOperation({ summary: '테넌트 비활성화' })
  async disableTenant(@Param() param: DeleteTenantParamDto) {
    await this.tenantUsecase.deleteTenant(param.tenantId);
    return { success: true };
  }

  @Put(':tenantId/config')
  @ApiOperation({ summary: '테넌트 설정 수정' })
  async updateTenantConfig(@Param() param: UpdateTenantConfigParamDto, @Body() body: UpdateTenantConfigBodyDto) {
    return await this.tenantUsecase.updateTenantConfig(param.tenantId, {
      signupPolicy: body.signupPolicy,
      requirePhoneVerify: body.requirePhoneVerify,
      brandName: body.brandName,
      extra: body.extra,
    });
  }

  @Get(':tenantId/config')
  @ApiOperation({ summary: '테넌트 설정 조회' })
  async getTenantConfig(@Param() param: UpdateTenantConfigParamDto) {
    const config = await this.tenantUsecase.getTenantConfig(param.tenantId);
    if (!config) {
      throw new Error('Tenant config not found');
    }
    return config;
  }
}

