import { Injectable } from '@nestjs/common';
import { ulid } from 'ulid';
import * as crypto from 'crypto';
import { User } from '../../../domain/model/user';
import { UserRepositoryPort } from '../../../domain/port/user-repository.port';
import {
  UserUsecase,
  CreateUserInput,
  UpdateUserInput,
  UserDto,
  ListUsersQuery,
  PaginatedResult,
  UserStatus,
} from '../user.usecase';

@Injectable()
export class UserUsecaseImpl implements UserUsecase {
  constructor(
    private readonly userRepo: UserRepositoryPort,
  ) {}

  async createUser(input: CreateUserInput): Promise<UserDto> {
    // 중복 체크
    if (input.email) {
      const exists = await this.userRepo.existsByEmail(input.tenantId, input.email);
      if (exists) {
        throw new Error('Email already exists');
      }
    }

    const existsUsername = await this.userRepo.existsByUsername(input.tenantId, input.username);
    if (existsUsername) {
      throw new Error('Username already exists');
    }

    const passwordHash = input.password ? this.hashPassword(input.password) : undefined;

    const user = User.create({
      id: ulid(),
      tenantId: input.tenantId,
      username: input.username,
      email: input.email,
      phone: input.phone,
    });

    if (passwordHash) {
      user.setPasswordHash(passwordHash);
    }

    const saved = await this.userRepo.create(user);
    return this.toDto(saved);
  }

  async getUser(userId: string): Promise<UserDto | null> {
    const user = await this.userRepo.findById({ userId });
    if (!user) return null;
    return this.toDto(user);
  }

  async listUsers(query: ListUsersQuery): Promise<PaginatedResult<UserDto>> {
    if (!query.tenantId) {
      throw new Error('tenantId is required');
    }

    const result = await this.userRepo.findByTenant({
      tenantId: query.tenantId,
      status: query.status,
      search: query.search,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    
    return {
      items: result.users.map((u) => this.toDto(u)),
      total: result.total,
      page: query.page,
      limit: query.limit,
    };
  }

  async updateUser(userId: string, input: UpdateUserInput): Promise<UserDto> {
    const user = await this.userRepo.findById({ userId });
    if (!user) {
      throw new Error('User not found');
    }

    if (input.username !== undefined) {
      user.setUsername(input.username);
    }
    if (input.email !== undefined) {
      user.updateEmail(input.email);
    }
    if (input.phone !== undefined) {
      user.updatePhone(input.phone);
    }
    if (input.emailVerified !== undefined) {
      user.setEmailVerified(input.emailVerified);
    }
    if (input.phoneVerified !== undefined) {
      user.setPhoneVerified(input.phoneVerified);
    }

    const saved = await this.userRepo.update(user);
    return this.toDto(saved);
  }

  async deleteUser(userId: string): Promise<void> {
    await this.userRepo.delete(userId);
  }

  async updateUserStatus(userId: string, status: UserStatus): Promise<UserDto> {
    const user = await this.userRepo.findById({ userId });
    if (!user) {
      throw new Error('User not found');
    }

    user.setStatus(status);
    const saved = await this.userRepo.update(user);
    return this.toDto(saved);
  }

  async resetPassword(userId: string): Promise<{ tempPassword: string }> {
    const user = await this.userRepo.findById({ userId });
    if (!user) {
      throw new Error('User not found');
    }

    const tempPassword = this.generateTempPassword();
    const passwordHash = this.hashPassword(tempPassword);
    
    user.setPasswordHash(passwordHash);
    await this.userRepo.update(user);

    return { tempPassword };
  }

  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  private toDto(user: User): UserDto {
    return {
      id: user.id,
      tenantId: user.tenantId,
      username: user.username,
      email: user.email,
      emailVerified: user.emailVerified,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}

