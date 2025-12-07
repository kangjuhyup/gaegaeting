import { Injectable } from '@nestjs/common';
import { OtpRepositoryPort } from '../../../application/port/repository/otp-repository.port';

interface Entry { code: string; expiresAt: number }

@Injectable()
export class InMemoryOtpRepository extends OtpRepositoryPort {
  private readonly store = new Map<string, Entry>();

  async saveCode(phoneNumber: string, code: string, ttlSeconds: number): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(phoneNumber, { code, expiresAt });
  }

  async verifyAndConsume(phoneNumber: string, code: string): Promise<boolean> {
    const entry = this.store.get(phoneNumber);
    if (!entry) return false;
    const valid = entry.code === code && Date.now() <= entry.expiresAt;
    if (valid) this.store.delete(phoneNumber);
    return valid;
  }

  async hasActiveCode(phoneNumber: string): Promise<boolean> {
    const entry = this.store.get(phoneNumber);
    if (!entry) return false;
    // 만료되지 않은 코드가 있는지 확인
    return Date.now() <= entry.expiresAt;
  }
}


