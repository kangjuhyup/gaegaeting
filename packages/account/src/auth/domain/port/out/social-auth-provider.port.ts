import { SocialUserProfile } from "@app/auth/domain/model/auth-provider";
import { AuthToken } from "@app/auth/domain/model/auth-token";
import { AuthProvider } from "@core/database";

/**
 * 소셜 인증 제공자 포트
 * 
 * 소셜 로그인 제공자와의 통신을 위한 아웃바운드 포트입니다.
 */
export abstract class SocialAuthProviderPort {
  /**
   * 소셜 로그인 URL 생성
   * 
   * @param redirectUrl 인증 후 리다이렉트할 URL
   * @returns 소셜 로그인 페이지 URL
   */
  abstract getAuthorizationUrl(redirectUrl: string): string;
  
  /**
   * 인증 코드로 액세스 토큰 요청
   * 
   * @param code 인증 코드
   * @param redirectUrl 리다이렉트 URL (인증 요청 시 사용한 URL과 동일해야 함)
   * @returns 인증 토큰
   */
  abstract getAccessToken(code: string, redirectUrl: string): Promise<AuthToken>;
  
  /**
   * 액세스 토큰으로 사용자 정보 요청
   * 
   * @param accessToken 액세스 토큰
   * @returns 사용자 프로필 정보
   */
  abstract getUserProfile(accessToken: string): Promise<SocialUserProfile>;
  
  /**
   * 지원하는 인증 제공자 반환
   * 
   * @returns 인증 제공자 타입
   */
  abstract getSupportedProvider(): AuthProvider;
}
