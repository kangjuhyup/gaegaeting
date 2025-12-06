import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { UserOrmEntity, TenantOrmEntity, UserIdentityOrmEntity } from '@core/database';
import { UserRepositoryPort, FindUserByIdQuery, FindUsersByTenantQuery, FindUsersResult, FindUserByPhoneQuery } from '../../domain/port/user-repository.port';
import { User } from '../../domain/model/user';
import { UserMapper } from './mapper/user.mapper';

@Injectable()
export class UserRepositoryAdapter implements UserRepositoryPort {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly userRepo: Repository<UserOrmEntity>,
    @InjectRepository(TenantOrmEntity)
    private readonly tenantRepo: Repository<TenantOrmEntity>,
    @InjectRepository(UserIdentityOrmEntity)
    private readonly identityRepo: Repository<UserIdentityOrmEntity>,
  ) {}

  async create(user: User): Promise<User> {
    const tenant = await this.tenantRepo.findOne({ where: { id: user.tenantId } });
    if (!tenant) {
      throw new Error(`Tenant not found: ${user.tenantId}`);
    }

    const ormUser = this.userRepo.create(UserMapper.toOrm(user, tenant));
    const saved = await this.userRepo.save(ormUser);
    return UserMapper.toDomain(saved);
  }

  async findById(query: FindUserByIdQuery): Promise<User | null> {
    const user = await this.userRepo.findOne({
      where: { id: query.userId },
      relations: ['tenant', 'identities'],
    });
    if (!user) return null;
    return UserMapper.toDomain(user);
  }

  async findByTenant(query: FindUsersByTenantQuery): Promise<FindUsersResult> {
    const where: any = { tenant: { id: query.tenantId } };
    
    if (query.status) {
      where.status = query.status;
    }
    
    if (query.search) {
      where.username = Like(`%${query.search}%`);
    }

    const [items, total] = await this.userRepo.findAndCount({
      where,
      relations: ['tenant'],
      skip: query.skip,
      take: query.take,
      order: { createdAt: 'DESC' },
    });

    return {
      users: items.map((u) => UserMapper.toDomain(u)),
      total,
    };
  }

  async update(user: User): Promise<User> {
    const existing = await this.userRepo.findOne({
      where: { id: user.id },
      relations: ['tenant'],
    });
    if (!existing) {
      throw new Error('User not found');
    }

    const tenant = await this.tenantRepo.findOne({ where: { id: user.tenantId } });
    if (!tenant) {
      throw new Error(`Tenant not found: ${user.tenantId}`);
    }

    const updated = this.userRepo.merge(existing, UserMapper.toOrm(user, tenant));
    const saved = await this.userRepo.save(updated);
    return UserMapper.toDomain(saved);
  }

  async delete(userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }
    await this.userRepo.remove(user);
  }

  async existsByEmail(tenantId: string, email: string): Promise<boolean> {
    const count = await this.userRepo.count({
      where: { tenant: { id: tenantId }, email },
    });
    return count > 0;
  }

  async existsByUsername(tenantId: string, username: string): Promise<boolean> {
    const count = await this.userRepo.count({
      where: { tenant: { id: tenantId }, username },
    });
    return count > 0;
  }

  async findByIdentity(tenantId: string, provider: string, providerSub: string): Promise<User | null> {
    const identity = await this.identityRepo.findOne({
      where: {
        tenant: { id: tenantId },
        provider: provider as any,
        providerSub,
      },
      relations: ['user', 'tenant'],
    });

    if (!identity) return null;
    return UserMapper.toDomain(identity.user, [identity]);
  }

  async findByPhone(query: FindUserByPhoneQuery): Promise<User | null> {
    const user = await this.userRepo.findOne({
      where: {
        tenant: { id: query.tenantId },
        phone: query.phone,
      },
      relations: ['tenant', 'identities'],
    });
    if (!user) return null;
    return UserMapper.toDomain(user);
  }
}

