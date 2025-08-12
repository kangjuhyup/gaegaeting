import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * 소셜 로그인 리다이렉트 URL 생성 전략 인터페이스
 */
export interface SocialRedirectStrategy {
  /**
   * 인증 URL 생성
   * 
   * @param redirectUrl 콜백 URL
   * @returns 인증 URL
   */
  generateAuthUrl(redirectUrl: string): string;
}

/**
 * 카카오 로그인 리다이렉트 URL 생성 전략
 */
@Injectable()
export class KakaoRedirectStrategy implements SocialRedirectStrategy {
  constructor(private readonly configService: ConfigService) {}
  
  generateAuthUrl(redirectUrl: string): string {
    const clientId = this.configService.get<string>('KAKAO_CLIENT_ID');
    const responseType = 'code';
    
    return `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=${responseType}`;
  }
}

/**
 * 네이버 로그인 리다이렉트 URL 생성 전략
 */
@Injectable()
export class NaverRedirectStrategy implements SocialRedirectStrategy {
  constructor(private readonly configService: ConfigService) {}
  
  generateAuthUrl(redirectUrl: string): string {
    const clientId = this.configService.get<string>('NAVER_CLIENT_ID');
    const responseType = 'code';
    const state = Math.random().toString(36).substring(2, 15); // CSRF 방지를 위한 랜덤 값
    
    return `https://nid.naver.com/oauth2.0/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=${responseType}&state=${state}`;
  }
}

/**
 * 구글 로그인 리다이렉트 URL 생성 전략
 */
@Injectable()
export class GoogleRedirectStrategy implements SocialRedirectStrategy {
  constructor(private readonly configService: ConfigService) {}
  
  generateAuthUrl(redirectUrl: string): string {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const responseType = 'code';
    const scope = 'email profile';
    
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=${responseType}&scope=${encodeURIComponent(scope)}`;
  }
}
