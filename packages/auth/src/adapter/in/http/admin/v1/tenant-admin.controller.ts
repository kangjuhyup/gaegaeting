import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Admin - Tenant')
@ApiBearerAuth('admin-token')
@Controller('admin/v1/tenants')
export class TenantAdminController {
  @Post()
  @ApiOperation({ summary: '테넌트 생성' })
  async createTenant(@Body() dto: any) {
    return { id: 'tenant_123', name: dto.name, status: 'ACTIVE' };
  }

  @Get()
  @ApiOperation({ summary: '테넌트 목록 조회' })
  async listTenants(@Query('page') page = 1, @Query('limit') limit = 20) {
    return { items: [], total: 0, page, limit };
  }

  @Get(':tenantId')
  @ApiOperation({ summary: '테넌트 상세 조회' })
  async getTenant(@Param('tenantId') tenantId: string) {
    return { id: tenantId, name: 'Sample Tenant', status: 'ACTIVE' };
  }

  @Put(':tenantId')
  @ApiOperation({ summary: '테넌트 수정' })
  async updateTenant(@Param('tenantId') tenantId: string, @Body() dto: any) {
    return { id: tenantId, ...dto };
  }

  @Delete(':tenantId')
  @ApiOperation({ summary: '테넌트 비활성화' })
  async disableTenant(@Param('tenantId') tenantId: string) {
    return { success: true };
  }

  @Put(':tenantId/config')
  @ApiOperation({ summary: '테넌트 설정 수정' })
  async updateTenantConfig(@Param('tenantId') tenantId: string, @Body() config: any) {
    return { tenantId, config };
  }
}

