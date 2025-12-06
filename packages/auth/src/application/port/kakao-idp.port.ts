export interface KakaoTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface KakaoProfile {
  id: string;
  email?: string;
  nickname?: string;
  raw?: any;
}

export abstract class KakaoIdpPort {
  abstract exchangeAuthCode(code: string, redirectUri?: string): Promise<KakaoTokenResponse>;
  abstract getProfile(accessToken: string): Promise<KakaoProfile>;
}


