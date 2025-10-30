import { Injectable } from '@nestjs/common';
import { NaverCloudApiPort } from '../port/naver-cloud-api.port';
import { OtpRepositoryPort } from '../port/otp-repository.port';

export interface RequestOtpInput {
  tenantId: string;
  phoneNumber: string;
}

export interface VerifyOtpInput {
  tenantId: string;
  phoneNumber: string;
  code: string;
}

@Injectable()
export class OtpUsecase {
  private readonly ttlSeconds = 180; // 3 minutes

  constructor(
    private readonly naver: NaverCloudApiPort,
    private readonly otpRepo: OtpRepositoryPort,
  ) {}

  async requestOtp(input: RequestOtpInput): Promise<{ sent: boolean }> {
    const code = this.generateCode();
    await this.otpRepo.saveCode(input.phoneNumber, code, this.ttlSeconds);
    const message = `[개개팅] 인증번호 ${code} (유효시간 ${Math.floor(this.ttlSeconds / 60)}분)`;
    await this.naver.sendSms(input.phoneNumber, message);
    return { sent: true };
  }

  async verifyOtp(input: VerifyOtpInput): Promise<{ verified: boolean }> {
    const ok = await this.otpRepo.verifyAndConsume(input.phoneNumber, input.code);
    return { verified: ok };
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}