import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoleUsecase, CreateRoleInput, ListRolesQuery } from '@app/application/usecase/role.usecase';
import { PermissionUsecase, ListPermissionsQuery } from '@app/application/usecase/permission.usecase';
import {
  CreateRoleBodyDto,
  UpdateRoleBodyDto,
  ListRolesQueryDto,
  GetRoleParamDto,
  AddPermissionsBodyDto,
  AssignRoleToUserParamDto,
  RemovePermissionParamDto,
  ListPermissionsQueryDto,
} from './dto/role.dto';

@ApiTags('Admin - Role & Permission')
@ApiBearerAuth('admin-token')
@Controller('admin/v1/roles')
export class RoleAdminController {
  constructor(
    private readonly roleUsecase: RoleUsecase,
    private readonly permissionUsecase: PermissionUsecase,
  ) {}

  @Post()
  @ApiOperation({ summary: '역할 생성' })
  async createRole(@Body() dto: CreateRoleBodyDto) {
    const input: CreateRoleInput = {
      tenantId: dto.tenantId,
      code: dto.code,
      name: dto.name,
      description: dto.description,
    };
    return await this.roleUsecase.createRole(input);
  }

  @Get()
  @ApiOperation({ summary: '역할 목록 조회' })
  async listRoles(
    @Query() query: ListRolesQueryDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const listQuery: ListRolesQuery = {
      tenantId: query.tenantId,
      page,
      limit,
    };
    return await this.roleUsecase.listRoles(listQuery);
  }

  @Get(':roleId')
  @ApiOperation({ summary: '역할 상세 조회' })
  async getRole(@Param() params: GetRoleParamDto) {
    const role = await this.roleUsecase.getRole(params.roleId);
    if (!role) {
      throw new Error('Role not found');
    }
    const permissions = await this.permissionUsecase.getRolePermissions(params.roleId);
    return { ...role, permissions };
  }

  @Put(':roleId')
  @ApiOperation({ summary: '역할 수정' })
  async updateRole(@Param() params: GetRoleParamDto, @Body() dto: UpdateRoleBodyDto) {
    return await this.roleUsecase.updateRole(params.roleId, dto);
  }

  @Delete(':roleId')
  @ApiOperation({ summary: '역할 삭제' })
  async deleteRole(@Param() params: GetRoleParamDto) {
    await this.roleUsecase.deleteRole(params.roleId);
    return { success: true };
  }

  @Post(':roleId/permissions')
  @ApiOperation({ summary: '역할에 권한 추가' })
  async addPermissions(
    @Param() params: GetRoleParamDto,
    @Body() dto: AddPermissionsBodyDto,
  ) {
    for (const permissionId of dto.permissionIds) {
      await this.permissionUsecase.assignPermissionToRole({
        roleId: params.roleId,
        permissionId,
      });
    }
    return { roleId: params.roleId, added: dto.permissionIds };
  }

  @Delete(':roleId/permissions/:permissionId')
  @ApiOperation({ summary: '역할에서 권한 제거' })
  async removePermission(@Param() params: RemovePermissionParamDto) {
    await this.permissionUsecase.removePermissionFromRole(params.roleId, params.permissionId);
    return { success: true };
  }

  @Post(':roleId/users/:userId')
  @ApiOperation({ summary: '사용자에게 역할 할당' })
  async assignRoleToUser(@Param() params: AssignRoleToUserParamDto) {
    await this.roleUsecase.assignRoleToUser({
      userId: params.userId,
      roleId: params.roleId,
    });
    return { success: true };
  }

  @Delete(':roleId/users/:userId')
  @ApiOperation({ summary: '사용자에게서 역할 제거' })
  async removeRoleFromUser(@Param() params: AssignRoleToUserParamDto) {
    await this.roleUsecase.removeRoleFromUser(params.userId, params.roleId);
    return { success: true };
  }

  @Get('permissions')
  @ApiOperation({ summary: '권한 목록 조회' })
  async listPermissions(
    @Query() query: ListPermissionsQueryDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const listQuery: ListPermissionsQuery = {
      tenantId: query.tenantId,
      resource: query.resource,
      page,
      limit,
    };
    return await this.permissionUsecase.listPermissions(listQuery);
  }
}

