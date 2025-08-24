import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FetchHttpClient } from '@core/http';
import { SocialUserProfile } from '@app/auth/domain/model/auth-provider';
import { AuthToken } from '@app/auth/domain/model/auth-token';
import { SocialAuthProviderPort } from '@app/auth/domain/port/social-auth-provider.port';
import { ENV_KEY } from '../../../../../config/env.config';
import { AuthProvider } from '@core/auth';

/**
 * 카카오 인증 어댑터
 * 
 * 카카오 로그인 API와 통신하는 아웃바운드 어댑터입니다.
 */
@Injectable()
export class KakaoAuthAdapter implements SocialAuthProviderPort {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly kakaoAuthUrl = 'https://kauth.kakao.com';
  private readonly kakaoApiUrl = 'https://kapi.kakao.com';
  
  constructor(
    private readonly httpClient: FetchHttpClient,
    private readonly configService: ConfigService,
  ) {
    this.clientId = this.configService.get<string>(ENV_KEY.KAKAO_CLIENT_ID);
    this.clientSecret = this.configService.get<string>(ENV_KEY.KAKAO_CLIENT_SECRET, '');
    
    if (!this.clientId) {
      throw new Error('KAKAO_CLIENT_ID 환경 변수가 설정되지 않았습니다.');
    }
  }
  
  /**
   * 카카오 로그인 URL 생성
   * 
   * @param redirectUrl 인증 후 리다이렉트할 URL
   * @returns 카카오 로그인 페이지 URL
   */
  getAuthorizationUrl(redirectUrl: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUrl,
      response_type: 'code',
    });
    
    return `${this.kakaoAuthUrl}/oauth/authorize?${params.toString()}`;
  }
  
  /**
   * 인증 코드로 액세스 토큰 요청
   * 
   * @param code 인증 코드
   * @param redirectUrl 리다이렉트 URL
   * @returns 인증 토큰
   */
  async getAccessToken(code: string, redirectUrl: string): Promise<AuthToken> {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', this.clientId);
    params.append('redirect_uri', redirectUrl);
    params.append('code', code);
    params.append('client_secret', this.clientSecret);
    
    const response = await this.httpClient.post<{
      token_type: string;
      access_token: string;
      id_token: string;
      expires_in: number;
      refresh_token: string;
      refresh_token_expires_in : number;
      scope : string;
    }>(
      `${this.kakaoAuthUrl}/oauth/token?${params.toString()}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
      }
    );
    
    const data = response.data;
    
    return new AuthToken({
      accessToken : data.access_token,
      refreshToken : data.refresh_token,
      expiresIn : data.expires_in,
      refreshTokenExpiresIn : data.refresh_token_expires_in,
      tokenType : data.token_type
    });
  }
  
  /**
   * 액세스 토큰으로 사용자 정보 요청
   * 
   * @param accessToken 액세스 토큰
   * @returns 사용자 프로필 정보
   */
  async getUserProfile(accessToken: string): Promise<SocialUserProfile> {
    const response = await this.httpClient.get<{
      id : number;
      has_signed_up : true,
      connected_at : Date,
      synced_at : Date
      properties : {
        nickname : string,
        profile_image : string,
      },
      kakao_account : {
        email : string,
        profile: {
            nickname: string,
            thumbnail_image_url: string,
            profile_image_url: string,
            is_default_image: boolean,
            is_default_nickname: boolean
        },
      },
      for_partner : {
      },
    }>(
      `${this.kakaoApiUrl}/v2/user/me`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type' : 'application/x-www-form-urlencoded;charset=utf-8',
        },
      }
    );
    
    const data = response.data;
    
    // 카카오 응답에서 필요한 정보 추출
    const providerId = String(data.id);
    const email = data.kakao_account?.email || null;
    const name = data.properties?.nickname || data.kakao_account?.profile?.nickname || null;
    const profileImage = data.properties?.profile_image || data.kakao_account?.profile?.profile_image_url || null;
    
    return new SocialUserProfile(
      AuthProvider.KAKAO,
      providerId,
      email,
      name,
      profileImage
    );
  }
  
  /**
   * 지원하는 인증 제공자 반환
   * 
   * @returns 인증 제공자 타입
   */
  getSupportedProvider(): AuthProvider {
    return AuthProvider.KAKAO;
  }
}
