import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateRoleBodyDto {
  @ApiProperty({ description: '테넌트 ID', example: 'tenant_123' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ description: '역할 코드', example: 'ADMIN' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: '역할 이름', example: '관리자' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '역할 설명', example: '시스템 관리자 역할' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateRoleBodyDto {
  @ApiPropertyOptional({ description: '역할 이름', example: '관리자' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: '역할 설명', example: '시스템 관리자 역할' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class ListRolesQueryDto {
  @ApiPropertyOptional({ description: '테넌트 ID', example: 'tenant_123' })
  @IsString()
  @IsOptional()
  tenantId?: string;

  @ApiPropertyOptional({ description: '페이지 번호', example: 1, default: 1 })
  @IsString()
  @IsOptional()
  page?: string;

  @ApiPropertyOptional({ description: '페이지 크기', example: 20, default: 20 })
  @IsString()
  @IsOptional()
  limit?: string;
}

export class GetRoleParamDto {
  @ApiProperty({ description: '역할 ID', example: 'role_123' })
  @IsString()
  @IsNotEmpty()
  roleId: string;
}

export class AddPermissionsBodyDto {
  @ApiProperty({ description: '권한 ID 목록', example: ['perm_1', 'perm_2'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  permissionIds: string[];
}

export class AssignRoleToUserParamDto {
  @ApiProperty({ description: '역할 ID', example: 'role_123' })
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({ description: '사용자 ID', example: 'user_123' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class RemovePermissionParamDto {
  @ApiProperty({ description: '역할 ID', example: 'role_123' })
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({ description: '권한 ID', example: 'perm_123' })
  @IsString()
  @IsNotEmpty()
  permissionId: string;
}

export class ListPermissionsQueryDto {
  @ApiPropertyOptional({ description: '클라이언트 ID', example: 'client_123' })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional({ description: '테넌트 ID', example: 'tenant_123' })
  @IsString()
  @IsOptional()
  tenantId?: string;

  @ApiPropertyOptional({ description: '리소스', example: 'user' })
  @IsString()
  @IsOptional()
  resource?: string;
}

