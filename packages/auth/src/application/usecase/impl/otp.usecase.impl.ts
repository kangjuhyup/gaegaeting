import { Injectable } from '@nestjs/common';
import { AuthPayloadDto, TokenServicePort } from '../../port/token-service.port';
import { UserServicePort } from '../../port/user-service.port';
import { OtpServicePort } from '../../port/otp-service.port';
import { OtpUsecase, RequestOtpInput, VerifyOtpInput } from '../otp.usecase';

@Injectable()
export class OtpUsecaseImpl implements OtpUsecase {
  constructor(
    private readonly otpService: OtpServicePort,
    private readonly tokenService: TokenServicePort,
    private readonly userService: UserServicePort,
  ) {}

  async requestOtp(input: RequestOtpInput): Promise<{ sent: boolean }> {
    const user = await this.userService.findById(input.payload.userId);
    return await this.otpService.requestOtp({
      user: user,
      phoneNumber: input.phoneNumber,
    });
  }

  async verifyOtp(input: VerifyOtpInput): Promise<{ verified: boolean; payload?: AuthPayloadDto }> {
    const user = await this.userService.findById(input.payload.userId);
    const result = await this.otpService.verifyOtp({
      user: user,
      phoneNumber: input.phoneNumber,
      code: input.code,
    });

    if (result.verified && result.phoneVerified) {
      // 사용자의 역할과 권한 조회
      const { roles, permissions } = await this.userService.getUserRolesAndPermissions(user.id);

      // 새로운 토큰 발급 (phoneVerified 정보 및 역할/권한 포함)
      const payload = await this.tokenService.issueForUser({
        userId: user.id,
        tenantId: user.tenantId,
        phoneVerified: true,
        emailVerified: user.emailVerified,
        roles,
        permissions,
      });
      
      return { verified: true, payload };
    }
    
    return { verified: false };
  }
}

