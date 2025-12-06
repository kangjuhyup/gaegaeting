import { Injectable, InternalServerErrorException, Logger, BadRequestException } from '@nestjs/common';
import { SmsApiPort } from '../../port/sms-api.port';
import { OtpRepositoryPort } from '../../port/otp-repository.port';
import { UserRepositoryPort } from '../../../domain/port/user-repository.port';
import { OtpUsecase, RequestOtpInput, VerifyOtpInput } from '../otp.usecase';

@Injectable()
export class OtpUsecaseImpl implements OtpUsecase {
  private readonly ttlSeconds = 180; // 3 minutes
  private readonly logger = new Logger(OtpUsecaseImpl.name);

  constructor(
    private readonly sms: SmsApiPort,
    private readonly otpRepo: OtpRepositoryPort,
    private readonly userRepo: UserRepositoryPort,
  ) {}

  async requestOtp(input: RequestOtpInput): Promise<{ sent: boolean }> {
    const { user, phoneNumber } = input;

    // 휴대폰 인증이 이미 완료된 경우 OTP 요청 불가
    if (user.phoneVerified) {
      throw new BadRequestException(`Phone number ${phoneNumber} is already verified`);
    }

    // TTL 동안 재요청 불가능 - 이미 활성화된 코드가 있는지 확인
    const hasActiveCode = await this.otpRepo.hasActiveCode(phoneNumber);
    if (hasActiveCode) {
      throw new BadRequestException(`OTP request is not allowed. Please wait ${Math.floor(this.ttlSeconds / 60)} minutes before requesting again.`);
    }

    const code = this.generateCode();
    await this.otpRepo.saveCode(phoneNumber, code, this.ttlSeconds);
    const message = `[개개팅] 인증번호 ${code} (유효시간 ${Math.floor(this.ttlSeconds / 60)}분)`;

    await this.sms.sendSms(phoneNumber, message).catch((err) => {
      this.logger.error(err.message);
      throw new InternalServerErrorException(err.message);
    });

    // 유저 휴대폰번호 업데이트
    user.updatePhone(phoneNumber);
    await this.userRepo.update(user);

    return { sent: true };
  }

  async verifyOtp(input: VerifyOtpInput): Promise<{ verified: boolean }> {
    const { user, phoneNumber, code } = input;
    
    const ok = await this.otpRepo.verifyAndConsume(phoneNumber, code);
    
    if (ok) {
      // OTP 검증 성공 시 사용자의 휴대폰 인증 상태를 완료로 변경
      user.verifyPhone();
      await this.userRepo.update(user);
      this.logger.log(`Phone verified for user: ${user.id}`);
    }
    
    return { verified: ok };
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

