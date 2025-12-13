import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantOrmEntity } from '@core/database';
import { User } from '@app/domain/model/user';
import { TenantMapper } from '@app/adapter/out/mapper/tenant.mapper';
import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { ENV_KEY } from '../config/env.config';
import { RoleServicePort } from '@app/application/port/role-service.port';
import { UserServicePort } from '@app/application/port/user-service.port';

@Injectable()
export class InitService implements OnModuleInit {

  private readonly rootId : string;
  private readonly rootPassword : string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly userService: UserServicePort,
    private readonly config : ConfigService,
    private readonly roleService: RoleServicePort,
  ) {
    this.rootId = this.config.get(ENV_KEY.AUTH_ROOT_ID);
    this.rootPassword = this.config.get(ENV_KEY.AUTH_ROOT_PASSWORD);
  }

  async onModuleInit() {
    await this.initializeDefaultTenant();
    await this.initializeAdminUser();
  }

  private async initializeDefaultTenant() {
    const tenantRepo = this.dataSource.getRepository(TenantOrmEntity);
    const existingTenant = await tenantRepo.findOne({
      where: { code: 'gaegaeting' },
    });

    if (!existingTenant) {
      const tenant = tenantRepo.create({
        code: 'gaegaeting',
        name: '개개팅',
      });
      await tenantRepo.save(tenant);
      console.log('✅ Default tenant "gaegaeting" created');
    } else {
      console.log('✅ Default tenant "gaegaeting" already exists');
    }
  }

  private async initializeAdminUser() {
    const tenantRepo = this.dataSource.getRepository(TenantOrmEntity);
    const tenant = await tenantRepo.findOne({
      where: { code: 'gaegaeting' },
    });

    if (!tenant) {
      console.error('❌ Tenant "gaegaeting" not found. Cannot create admin user.');
      return;
    }

    // username(root)으로 기존 admin 사용자 확인
    const tenantId = String(tenant.id);
    const existsAdmin = await this.userService.existsByUsername(tenantId, 'root');
    if (existsAdmin) {
      console.log('✅ Admin user already exists');
      // 기존 유저가 있어도 ADMIN Role이 보장/할당되어야 함
      const users = await this.userService.findByTenant({
        tenantId,
        search: 'root',
        skip: 0,
        take: 10,
      });
      const existing =
        users.users.find((u) => u.username === 'root');
      if (existing) await this.ensureAdminRoleAssigned(tenantId, existing.id);
      return;
    }

    // 비밀번호 해싱 (SHA-256)
    const passwordHash = createHash('sha256')
      .update(this.rootPassword)
      .digest('hex');

    const adminUser = User.create({
      id: this.rootId,
      tenantId,
      username: 'root',
      email: 'root@gaegaeting.com',
    });

    adminUser.setPasswordHash(passwordHash);
    adminUser.setStatus('ACTIVE');

    // Tenant 도메인 모델로 변환
    const tenantDomain = TenantMapper.toDomain(tenant);

    await this.userService.create(adminUser);
    
    // ADMIN 역할 부여 (없으면 생성 후 할당)
    await this.ensureAdminRoleAssigned(tenantId, adminUser.id);
    console.log(`✅ Admin user created (username: ${this.rootId}, password: ${this.rootPassword})`);
  }

  private async ensureAdminRoleAssigned(tenantId: string, userId: string) {
    // 1) ADMIN Role 존재 확인 (없으면 생성)
    const existingRole = await this.roleService.findByCode(tenantId, 'ADMIN');
    const role =
      existingRole ??
      (await this.roleService.createRole({
        tenantId,
        code: 'ADMIN',
        name: 'ADMIN',
        description: 'System administrator role',
      }));

    // 2) User에게 Role 할당 (Repository 쪽에서 중복 할당은 무시)
    await this.roleService.assignRoleToUser(userId, role.id);
  }
}

