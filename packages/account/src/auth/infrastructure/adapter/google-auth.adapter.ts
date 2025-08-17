import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FetchHttpClient } from '@core/http';
import { SocialUserProfile } from '@app/auth/domain/model/auth-provider';
import { AuthToken } from '@app/auth/domain/model/auth-token';
import { SocialAuthProviderPort } from '@app/auth/domain/port/social-auth-provider.port';
import { AuthProvider } from '@core/auth';

/**
 * 구글 인증 어댑터
 * 
 * 구글 로그인 API와 통신하는 아웃바운드 어댑터입니다.
 */
@Injectable()
export class GoogleAuthAdapter implements SocialAuthProviderPort {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly googleAuthUrl = 'https://accounts.google.com';
  private readonly googleTokenUrl = 'https://oauth2.googleapis.com';
  private readonly googleApiUrl = 'https://www.googleapis.com';
  
  constructor(
    private readonly httpClient: FetchHttpClient,
    private readonly configService: ConfigService,
  ) {
    this.clientId = this.configService.get<string>('GOOGLE_CLIENT_ID', '');
    this.clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET', '');
    
    if (!this.clientId) {
      throw new Error('GOOGLE_CLIENT_ID 환경 변수가 설정되지 않았습니다.');
    }
    
    if (!this.clientSecret) {
      throw new Error('GOOGLE_CLIENT_SECRET 환경 변수가 설정되지 않았습니다.');
    }
  }
  
  /**
   * 구글 로그인 URL 생성
   * 
   * @param redirectUrl 인증 후 리다이렉트할 URL
   * @returns 구글 로그인 페이지 URL
   */
  getAuthorizationUrl(redirectUrl: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUrl,
      response_type: 'code',
      scope: 'email profile',
      access_type: 'offline',
      prompt: 'consent',
    });
    
    return `${this.googleAuthUrl}/o/oauth2/v2/auth?${params.toString()}`;
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
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUrl,
      grant_type: 'authorization_code',
    });
    
    const response = await this.httpClient.post<any>(
      `${this.googleTokenUrl}/token`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );
    
    const data = response.data;
    
    return new AuthToken({
      accessToken : data.access_token,
      refreshToken : data.refresh_token || '',
      expiresIn : data.expires_in,
      refreshTokenExpiresIn : data.refresh_expires_in,
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
      `${this.googleApiUrl}/oauth2/v3/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    const data = response.data;
    
    // 구글 응답에서 필요한 정보 추출
    const providerId = data.sub;
    const email = data.email || null;
    const name = data.name || null;
    const profileImage = data.picture || null;
    
    return new SocialUserProfile(
      AuthProvider.GOOGLE,
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
    return AuthProvider.GOOGLE;
  }
}
