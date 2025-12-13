import { Injectable } from '@nestjs/common';
import { OtpRepositoryPort } from '../../../application/port/repository/otp-repository.port';
import { CacheService } from '@core/redis';

interface OtpEntry {
  code: string;
  phoneNumber: string;
}

@Injectable()
export class RedisOtpRepository extends OtpRepositoryPort {
  private readonly namespace = 'otp';

  constructor(private readonly cacheService: CacheService) {
    super();
  }

  private getKey(phoneNumber: string): string {
    return `code:${phoneNumber}`;
  }

  async saveCode(phoneNumber: string, code: string, ttlSeconds: number): Promise<void> {
    const entry: OtpEntry = {
      code,
      phoneNumber,
    };
    const key = this.getKey(phoneNumber);
    await this.cacheService.set(key, entry, ttlSeconds, this.namespace);
  }

  async verifyAndConsume(phoneNumber: string, code: string): Promise<boolean> {
    const key = this.getKey(phoneNumber);
    const entry = await this.cacheService.get<OtpEntry>(key, this.namespace);
    
    if (!entry) {
      return false;
    }

    const valid = entry.code === code && entry.phoneNumber === phoneNumber;
    
    if (valid) {
      // 검증 성공 시 코드 삭제 (일회용)
      await this.cacheService.del(key, this.namespace);
    }
    
    return valid;
  }

  async hasActiveCode(phoneNumber: string): Promise<boolean> {
    const key = this.getKey(phoneNumber);
    const entry = await this.cacheService.get<OtpEntry>(key, this.namespace);
    return entry !== null;
  }
}

