import { PersistenceEntity } from '@core/model';
import * as crypto from 'crypto';

export type UserStatus = 'ACTIVE' | 'LOCKED' | 'DISABLED';

export interface UserIdentity {
  provider: 'kakao' | 'apple' | 'naver' | 'google';
  providerSub: string;
  email?: string;
  linkedAt: Date;
}

interface IUser {
  tenantId: string;
  username: string;
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  passwordHash?: string | null;
  status: UserStatus;
  identities: UserIdentity[];
}

export class User extends PersistenceEntity<string, IUser> {
  private constructor(param: IUser, id?: string) {
    super(param, id);
  }

  static of(param: IUser, id?: string): User {
    return new User(param, id);
  }

  static create(params: {
    id: string;
    tenantId: string;
    username: string;
    email?: string;
    phone?: string;
  }): User {
    return new User(
      {
        tenantId: params.tenantId,
        username: params.username,
        email: params.email ?? null,
        emailVerified: false,
        phone: params.phone ?? null,
        phoneVerified: false,
        status: 'ACTIVE',
        identities: [],
      },
      params.id,
    );
  }

  get tenantId(): string {
    return this.etc.tenantId;
  }

  get username(): string {
    return this.etc.username;
  }

  get email(): string | null {
    return this.etc.email;
  }

  get emailVerified(): boolean {
    return this.etc.emailVerified;
  }

  get phone(): string | null {
    return this.etc.phone;
  }

  get phoneVerified(): boolean {
    return this.etc.phoneVerified;
  }

  get passwordHash(): string | null | undefined {
    return this.etc.passwordHash;
  }

  get status(): UserStatus {
    return this.etc.status;
  }

  get identities(): UserIdentity[] {
    return this.etc.identities;
  }

  isActive(): boolean {
    return this.status === 'ACTIVE';
  }

  isLocked(): boolean {
    return this.status === 'LOCKED';
  }

  isDisabled(): boolean {
    return this.status === 'DISABLED';
  }

  canLogin(): boolean {
    return this.status === 'ACTIVE';
  }

  lock(): void {
    if (this.etc.status === 'DISABLED') {
      throw new Error('Cannot lock a disabled user');
    }
    this.etc.status = 'LOCKED';
  }

  unlock(): void {
    if (this.etc.status === 'DISABLED') {
      throw new Error('Cannot unlock a disabled user');
    }
    this.etc.status = 'ACTIVE';
  }

  disable(): void {
    this.etc.status = 'DISABLED';
  }

  enable(): void {
    this.etc.status = 'ACTIVE';
  }

  updateEmail(email: string): void {
    this.etc.email = email;
    this.etc.emailVerified = false;
  }

  verifyEmail(): void {
    if (!this.etc.email) {
      throw new Error('No email to verify');
    }
    this.etc.emailVerified = true;
  }

  updatePhone(phone: string): void {
    this.etc.phone = phone;
    this.etc.phoneVerified = false;
  }

  verifyPhone(): void {
    if (!this.etc.phone) {
      throw new Error('No phone to verify');
    }
    this.etc.phoneVerified = true;
  }

  setUsername(username: string): void {
    this.etc.username = username;
  }

  setPasswordHash(passwordHash: string): void {
    this.etc.passwordHash = passwordHash;
  }

  setStatus(status: UserStatus): void {
    this.etc.status = status;
  }

  setEmailVerified(verified: boolean): void {
    this.etc.emailVerified = verified;
  }

  setPhoneVerified(verified: boolean): void {
    this.etc.phoneVerified = verified;
  }

  hasIdentity(provider: string): boolean {
    return this.identities.some((i) => i.provider === provider);
  }

  getIdentity(provider: string): UserIdentity | undefined {
    return this.identities.find((i) => i.provider === provider);
  }

  /**
   * 비밀번호를 해시화합니다.
   */
  static hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * 임시 비밀번호를 생성합니다.
   */
  static generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}

