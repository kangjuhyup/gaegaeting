import { User } from '../model/user';

export interface FindUserByIdQuery {
  userId: string;
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

export interface FindUserByPhoneQuery {
  tenantId: string;
  phone: string;
}

export abstract class UserRepositoryPort {
  abstract create(user: User): Promise<User>;
  abstract findById(query: FindUserByIdQuery): Promise<User | null>;
  abstract findByTenant(query: FindUsersByTenantQuery): Promise<FindUsersResult>;
  abstract update(user: User): Promise<User>;
  abstract delete(userId: string): Promise<void>;
  abstract existsByEmail(tenantId: string, email: string): Promise<boolean>;
  abstract existsByUsername(tenantId: string, username: string): Promise<boolean>;
  abstract findByIdentity(tenantId: string, provider: string, providerSub: string): Promise<User | null>;
  abstract findByPhone(query: FindUserByPhoneQuery): Promise<User | null>;
}

