import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserIdentityOrmEntity, TenantOrmEntity, UserOrmEntity } from '@core/database';
import { UserIdentityRepositoryPort, CreateUserIdentityCommand } from '../../domain/port/user-identity-repository.port';

@Injectable()
export class UserIdentityRepositoryAdapter implements UserIdentityRepositoryPort {
  constructor(
    @InjectRepository(UserIdentityOrmEntity)
    private readonly identityRepo: Repository<UserIdentityOrmEntity>,
    @InjectRepository(TenantOrmEntity)
    private readonly tenantRepo: Repository<TenantOrmEntity>,
    @InjectRepository(UserOrmEntity)
    private readonly userRepo: Repository<UserOrmEntity>,
  ) {}

  async create(cmd: CreateUserIdentityCommand): Promise<void> {
    const tenant = await this.tenantRepo.findOne({ where: { id: cmd.tenantId } });
    if (!tenant) {
      throw new Error(`Tenant not found: ${cmd.tenantId}`);
    }

    const user = await this.userRepo.findOne({ where: { id: cmd.userId } });
    if (!user) {
      throw new Error(`User not found: ${cmd.userId}`);
    }

    const identity = this.identityRepo.create({
      tenant,
      user,
      provider: cmd.provider as any,
      providerSub: cmd.providerSub,
      email: cmd.email ?? null,
      profileJson: cmd.profileJson ?? null,
    });

    await this.identityRepo.save(identity);
  }
}

