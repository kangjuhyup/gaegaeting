import { JwtPayload } from '@app/common/decorator/user.decorator';
import { AuthPayloadDto } from '../port/token-service.port';

export interface RequestOtpInput {
  payload: JwtPayload;
  phoneNumber: string;
}

export interface VerifyOtpInput {
  payload: JwtPayload;
  phoneNumber: string;
  code: string;
}

export abstract class OtpUsecase {
  abstract requestOtp(input: RequestOtpInput): Promise<{ sent: boolean }>;
  abstract verifyOtp(input: VerifyOtpInput): Promise<{ verified: boolean; payload?: AuthPayloadDto }>;
}
