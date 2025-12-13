import { User } from '../../domain/model/user';
import { AuthPayloadDto } from '../port/token-service.port';

export interface RequestOtpInput {
  user: User;
  phoneNumber: string;
}

export interface VerifyOtpInput {
  user: User;
  phoneNumber: string;
  code: string;
}

export abstract class OtpUsecase {
  abstract requestOtp(input: RequestOtpInput): Promise<{ sent: boolean }>;
  abstract verifyOtp(input: VerifyOtpInput): Promise<{ verified: boolean; payload?: AuthPayloadDto }>;
}
