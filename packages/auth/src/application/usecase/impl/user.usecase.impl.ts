import { Injectable } from '@nestjs/common';
import { ulid } from 'ulid';
import { User } from '../../../domain/model/user';
import { UserServicePort } from '../../port/user-service.port';
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
    private readonly userService: UserServicePort,
  ) {}

  async createUser(input: CreateUserInput): Promise<UserDto> {
    // 중복 체크
    if (input.email) {
      const exists = await this.userService.existsByEmail(input.tenantId, input.email);
      if (exists) {
        throw new Error('Email already exists');
      }
    }

    const existsUsername = await this.userService.existsByUsername(input.tenantId, input.username);
    if (existsUsername) {
      throw new Error('Username already exists');
    }

    const passwordHash = input.password ? User.hashPassword(input.password) : undefined;

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

    const saved = await this.userService.create(user);
    return this.toDto(saved);
  }

  async getUser(userId: string): Promise<UserDto | null> {
    const user = await this.userService.findById(userId);
    if (!user) return null;
    return this.toDto(user);
  }

  async listUsers(query: ListUsersQuery): Promise<PaginatedResult<UserDto>> {
    if (!query.tenantId) {
      throw new Error('tenantId is required');
    }

    const result = await this.userService.findByTenant({
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
    const user = await this.userService.findById(userId);
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

    const saved = await this.userService.update(user);
    return this.toDto(saved);
  }

  async deleteUser(userId: string): Promise<void> {
    await this.userService.delete(userId);
  }

  async updateUserStatus(userId: string, status: UserStatus): Promise<UserDto> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.setStatus(status);
    const saved = await this.userService.update(user);
    return this.toDto(saved);
  }

  async resetPassword(userId: string): Promise<{ tempPassword: string }> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const tempPassword = User.generateTempPassword();
    const passwordHash = User.hashPassword(tempPassword);
    
    user.setPasswordHash(passwordHash);
    await this.userService.update(user);

    return { tempPassword };
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
}

