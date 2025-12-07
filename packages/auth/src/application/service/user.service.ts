import { Injectable } from '@nestjs/common';
import { User } from '../../domain/model/user';
import { UserRepositoryPort } from '../port/repository/user-repository.port';
import { UserIdentityRepositoryPort } from '../port/repository/user-identity-repository.port';
import { RoleRepositoryPort } from '../port/repository/role-repository.port';
import { PermissionRepositoryPort } from '../port/repository/permission-repository.port';
import { TenantRepositoryPort } from '../port/repository/tenant-repository.port';
import { ulid } from 'ulid';
import { UserServicePort, UserRolesAndPermissions, CreateUserIdentityCommand, FindUsersByTenantQuery, FindUsersResult, CreateUserFromSocialProfileCommand } from '../port/user-service.port';

@Injectable()
export class UserService extends UserServicePort {
  constructor(
    private readonly userRepo: UserRepositoryPort,
    private readonly userIdentityRepo: UserIdentityRepositoryPort,
    private readonly roleRepo: RoleRepositoryPort,
    private readonly permissionRepo: PermissionRepositoryPort,
    private readonly tenantRepo: TenantRepositoryPort,
  ) {
    super();
  }

  async findById(userId: string): Promise<User | null> {
    return await this.userRepo.findById({ userId });
  }

  async update(user: User): Promise<User> {
    // Tenant 조회
    const tenant = await this.tenantRepo.findById({ tenantId: user.tenantId });
    if (!tenant) {
      throw new Error(`Tenant not found: ${user.tenantId}`);
    }
    // Repository에 도메인 모델과 tenant 전달
    return await this.userRepo.update(user, tenant);
  }

  async create(user: User): Promise<User> {
    // Tenant 조회
    const tenant = await this.tenantRepo.findById({ tenantId: user.tenantId });
    if (!tenant) {
      throw new Error(`Tenant not found: ${user.tenantId}`);
    }
    // Repository에 도메인 모델과 tenant 전달 (Repository에서 매핑 후 save)
    return await this.userRepo.save(user, tenant);
  }

  async findByIdentity(tenantId: string, provider: string, providerSub: string): Promise<User | null> {
    return await this.userRepo.findByIdentity(tenantId, provider, providerSub);
  }

  async delete(userId: string): Promise<void> {
    return await this.userRepo.delete(userId);
  }

  async findByTenant(query: FindUsersByTenantQuery): Promise<FindUsersResult> {
    return await this.userRepo.findByTenant(query);
  }

  async existsByEmail(tenantId: string, email: string): Promise<boolean> {
    return await this.userRepo.existsByEmail(tenantId, email);
  }

  async existsByUsername(tenantId: string, username: string): Promise<boolean> {
    return await this.userRepo.existsByUsername(tenantId, username);
  }

  async getUserRolesAndPermissions(userId: string, clientId?: string): Promise<UserRolesAndPermissions> {
    const userRoles = await this.roleRepo.getUserRoles(userId, clientId);
    const roles = userRoles.map((r) => r.code);
    
    // 각 역할의 권한을 조회하여 중복 제거
    const permissionSet = new Set<string>();
    for (const role of userRoles) {
      const rolePermissions = await this.permissionRepo.getRolePermissions(role.id);
      rolePermissions.forEach((p) => permissionSet.add(p.code));
    }
    const permissions = Array.from(permissionSet);

    return { roles, permissions };
  }

  async createIdentity(cmd: CreateUserIdentityCommand): Promise<void> {
    await this.userIdentityRepo.create(cmd);
  }

  async createUserFromSocialProfile(cmd: CreateUserFromSocialProfileCommand): Promise<User> {
    // 기존 사용자 조회
    let user = await this.userRepo.findByIdentity(cmd.tenantId, cmd.provider, cmd.providerSub);
    
    if (!user) {
      // Tenant 조회
      const tenant = await this.tenantRepo.findById({ tenantId: cmd.tenantId });
      if (!tenant) {
        throw new Error(`Tenant not found: ${cmd.tenantId}`);
      }
      // 새 사용자 생성
      const username = cmd.username || `${cmd.provider}_${cmd.providerSub}`;
      user = User.create({
        id: ulid(),
        tenantId: cmd.tenantId,
        username,
        email: cmd.email,
      });
      user = await this.userRepo.save(user, tenant);

      // Identity 생성
      await this.userIdentityRepo.create({
        tenantId: cmd.tenantId,
        userId: user.id,
        provider: cmd.provider,
        providerSub: cmd.providerSub,
        email: cmd.email,
        profileJson: cmd.profileJson,
      });
    }

    return user;
  }
}

