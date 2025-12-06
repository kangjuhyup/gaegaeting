import { Injectable } from '@nestjs/common';

export type UserStatus = 'ACTIVE' | 'LOCKED' | 'DISABLED';

export interface CreateUserInput {
  tenantId: string;
  username: string;
  email?: string;
  phone?: string;
  password?: string;
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
  phone?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

export interface UserDto {
  id: string;
  tenantId: string;
  username: string;
  email?: string | null;
  emailVerified: boolean;
  phone?: string | null;
  phoneVerified: boolean;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListUsersQuery {
  tenantId?: string;
  status?: UserStatus;
  search?: string;
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export abstract class UserUsecase {
  abstract createUser(input: CreateUserInput): Promise<UserDto>;
  abstract getUser(userId: string): Promise<UserDto | null>;
  abstract listUsers(query: ListUsersQuery): Promise<PaginatedResult<UserDto>>;
  abstract updateUser(userId: string, input: UpdateUserInput): Promise<UserDto>;
  abstract deleteUser(userId: string): Promise<void>;
  abstract updateUserStatus(userId: string, status: UserStatus): Promise<UserDto>;
  abstract resetPassword(userId: string): Promise<{ tempPassword: string }>;
}
