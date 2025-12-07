import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTenantBodyDto {
  @ApiProperty({
    description: '테넌트 코드 (고유 식별자)',
    example: 'acme',
    minLength: 1,
    maxLength: 64,
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: '테넌트 이름',
    example: 'Acme Corporation',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateTenantBodyDto {
  @ApiPropertyOptional({
    description: '테넌트 이름',
    example: 'Acme Corporation Updated',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  name?: string;
}

export class UpdateTenantConfigBodyDto {
  @ApiPropertyOptional({
    description: '회원가입 정책 (invite: 초대만 가능, open: 자유 가입)',
    example: 'open',
    enum: ['invite', 'open'],
  })
  @IsString()
  @IsOptional()
  signupPolicy?: 'invite' | 'open';

  @ApiPropertyOptional({
    description: '전화번호 인증 필수 여부',
    example: false,
  })
  @IsOptional()
  requirePhoneVerify?: boolean;

  @ApiPropertyOptional({
    description: '브랜드 이름',
    example: '개개팅',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  brandName?: string | null;

  @ApiPropertyOptional({
    description: '추가 설정 (JSON 객체)',
    example: {
      maxUsers: 1000,
      features: ['feature1', 'feature2'],
      customSetting: 'value',
    },
    nullable: true,
  })
  @IsObject()
  @IsOptional()
  extra?: Record<string, any> | null;
}

export class ListTenantsQueryDto {
  @ApiPropertyOptional({
    description: '페이지 번호',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: '페이지당 항목 수',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    description: '검색어 (테넌트 코드 또는 이름)',
    example: 'acme',
  })
  @IsString()
  @IsOptional()
  search?: string;
}

export class GetTenantParamDto {
  @ApiProperty({
    description: '테넌트 ID',
    example: 'tenant_123',
  })
  @IsString()
  @IsNotEmpty()
  tenantId: string;
}

export class UpdateTenantParamDto {
  @ApiProperty({
    description: '테넌트 ID',
    example: 'tenant_123',
  })
  @IsString()
  @IsNotEmpty()
  tenantId: string;
}

export class DeleteTenantParamDto {
  @ApiProperty({
    description: '테넌트 ID',
    example: 'tenant_123',
  })
  @IsString()
  @IsNotEmpty()
  tenantId: string;
}

export class UpdateTenantConfigParamDto {
  @ApiProperty({
    description: '테넌트 ID',
    example: 'tenant_123',
  })
  @IsString()
  @IsNotEmpty()
  tenantId: string;
}

