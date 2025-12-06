import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantOrmEntity } from '@core/database';
import { UserRepositoryPort } from '@app/domain/port/user-repository.port';
import { User } from '@app/domain/model/user';
import { createHash } from 'crypto';

@Injectable()
export class InitService implements OnModuleInit {
  constructor(
    private readonly dataSource: DataSource,
    private readonly userRepository: UserRepositoryPort,
  ) {}

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

    // username으로 기존 admin 사용자 확인
    const existsAdmin = await this.userRepository.existsByUsername(tenant.id, 'admin');
    if (existsAdmin) {
      console.log('✅ Admin user already exists');
      return;
    }

    // 비밀번호 해싱 (SHA-256)
    const passwordHash = createHash('sha256')
      .update('Pa55word')
      .digest('hex');

    const adminUser = User.create({
      id: 'admin',
      tenantId: String(tenant.id),
      username: 'admin',
      email: 'admin@gaegaeting.com',
    });

    adminUser.setPasswordHash(passwordHash);
    adminUser.setStatus('ACTIVE');

    await this.userRepository.create(adminUser);
    console.log('✅ Admin user created (username: admin, password: Pa55word)');
  }
}

