export interface KakaoSigninCommand {
  tenantId: string;
  authCode: string;
  redirectUri?: string;
}

export interface AppleSigninCommand {
  tenantId: string;
  idToken: string;
  authorizationCode?: string;
  userPayload?: string;
}

export interface NativeSigninCommand {
  tenantId: string;
  provider: 'kakao' | 'apple';
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
}

export interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export abstract class SocialSigninUseCase {
  abstract signinWithKakao(cmd: KakaoSigninCommand): Promise<AuthPayload>;
  abstract signinWithApple(cmd: AppleSigninCommand): Promise<AuthPayload>;
  abstract signinWithNativeToken(cmd: NativeSigninCommand): Promise<AuthPayload>;
}
