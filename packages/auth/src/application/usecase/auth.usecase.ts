import { AuthPayload } from './social-signin.usecase';

export interface SignoutCommand {
  userId: string;
  tenantId: string;
  token?: string;
  allDevices: boolean;
}

export interface RefreshTokenCommand {
  refreshToken: string;
  tenantId: string;
}

export abstract class AuthUsecase {
  abstract signout(cmd: SignoutCommand): Promise<void>;
  abstract refreshToken(cmd: RefreshTokenCommand): Promise<AuthPayload>;
}

