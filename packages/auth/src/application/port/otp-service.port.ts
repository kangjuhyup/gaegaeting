import { User } from '../../domain/model/user';

export interface RequestOtpCommand {
  user: User;
  phoneNumber: string;
}

export interface VerifyOtpCommand {
  user: User;
  phoneNumber: string;
  code: string;
}

export interface VerifyOtpResult {
  verified: boolean;
  phoneVerified?: boolean;
}

export abstract class OtpServicePort {
  abstract requestOtp(cmd: RequestOtpCommand): Promise<{ sent: boolean }>;
  abstract verifyOtp(cmd: VerifyOtpCommand): Promise<VerifyOtpResult>;
}

