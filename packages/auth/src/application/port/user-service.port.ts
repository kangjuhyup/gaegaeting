import { User } from '../../domain/model/user';

export interface UserRolesAndPermissions {
  roles: string[];
  permissions: string[];
}

export interface CreateUserIdentityCommand {
  tenantId: string;
  userId: string;
  provider: string;
  providerSub: string;
  email?: string;
  profileJson?: any;
}

export interface FindUsersByTenantQuery {
  tenantId: string;
  status?: string;
  search?: string;
  skip: number;
  take: number;
}

export interface FindUsersResult {
  users: User[];
  total: number;
}

export interface CreateUserFromSocialProfileCommand {
  tenantId: string;
  provider: 'kakao' | 'apple';
  providerSub: string;
  username?: string;
  email?: string;
  profileJson?: any;
}

export abstract class UserServicePort {
  abstract findById(userId: string): Promise<User | null>;
  abstract update(user: User): Promise<User>;
  abstract create(user: User): Promise<User>;
  abstract delete(userId: string): Promise<void>;
  abstract findByIdentity(tenantId: string, provider: string, providerSub: string): Promise<User | null>;
  abstract findByTenant(query: FindUsersByTenantQuery): Promise<FindUsersResult>;
  abstract existsByEmail(tenantId: string, email: string): Promise<boolean>;
  abstract existsByUsername(tenantId: string, username: string): Promise<boolean>;
  abstract getUserRolesAndPermissions(userId: string, clientId?: string): Promise<UserRolesAndPermissions>;
  abstract createIdentity(cmd: CreateUserIdentityCommand): Promise<void>;
  abstract createUserFromSocialProfile(cmd: CreateUserFromSocialProfileCommand): Promise<User>;
}

