import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FetchHttpClient } from '@core/http';
import { SocialUserProfile } from '@app/auth/domain/model/auth-provider';
import { AuthToken } from '@app/auth/domain/model/auth-token';
import { SocialAuthProviderPort } from '@app/auth/domain/port/out/social-auth-provider.port';
import { AuthProvider } from '@core/auth';

/**
 * 네이버 인증 어댑터
 * 
 * 네이버 로그인 API와 통신하는 아웃바운드 어댑터입니다.
 */
@Injectable()
export class NaverAuthAdapter implements SocialAuthProviderPort {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly naverAuthUrl = 'https://nid.naver.com';
  private readonly naverApiUrl = 'https://openapi.naver.com';
  
  constructor(
    private readonly httpClient: FetchHttpClient,
    private readonly configService: ConfigService,
  ) {
    this.clientId = this.configService.get<string>('NAVER_CLIENT_ID', '');
    this.clientSecret = this.configService.get<string>('NAVER_CLIENT_SECRET', '');
    
    if (!this.clientId) {
      throw new Error('NAVER_CLIENT_ID 환경 변수가 설정되지 않았습니다.');
    }
    
    if (!this.clientSecret) {
      throw new Error('NAVER_CLIENT_SECRET 환경 변수가 설정되지 않았습니다.');
    }
  }
  
  /**
   * 네이버 로그인 URL 생성
   * 
   * @param redirectUrl 인증 후 리다이렉트할 URL
   * @returns 네이버 로그인 페이지 URL
   */
  getAuthorizationUrl(redirectUrl: string): string {
    // 상태 값 생성 (CSRF 방지)
    const state = Math.random().toString(36).substring(2, 15);
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUrl,
      state,
    });
    
    return `${this.naverAuthUrl}/oauth2.0/authorize?${params.toString()}`;
  }
  
  /**
   * 인증 코드로 액세스 토큰 요청
   * 
   * @param code 인증 코드
   * @param redirectUrl 리다이렉트 URL
   * @returns 인증 토큰
   */
  async getAccessToken(code: string, redirectUrl: string): Promise<AuthToken> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: redirectUrl,
    });
    
    const response = await this.httpClient.get<any>(
      `${this.naverAuthUrl}/oauth2.0/token?${params.toString()}`
    );
    
    const data = response.data;
    
    return new AuthToken({
      accessToken : data.access_token,
      refreshToken : data.refresh_token,
      expiresIn : data.expires_in,
      refreshTokenExpiresIn : data.refresh_token_expires_in,
      tokenType : 'Bearer'
    });
  }
  
  /**
   * 액세스 토큰으로 사용자 정보 요청
   * 
   * @param accessToken 액세스 토큰
   * @returns 사용자 프로필 정보
   */
  async getUserProfile(accessToken: string): Promise<SocialUserProfile> {
    const response = await this.httpClient.get<any>(
      `${this.naverApiUrl}/v1/nid/me`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    const data = response.data;
    
    if (data.resultcode !== '00' || !data.response) {
      throw new Error(`네이버 사용자 정보 요청 실패: ${data.message || '알 수 없는 오류'}`);
    }
    
    // 네이버 응답에서 필요한 정보 추출
    const userInfo = data.response;
    const providerId = userInfo.id;
    const email = userInfo.email || null;
    const name = userInfo.name || userInfo.nickname || null;
    const profileImage = userInfo.profile_image || null;
    
    return new SocialUserProfile(
      AuthProvider.NAVER,
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
    return AuthProvider.NAVER;
  }
}
