/**
 * 사용자 인증 정보
 * 
 * JWT 토큰에서 추출한 사용자 인증 정보를 나타냅니다.
 * TokenMetadata와 동일한 구조를 가집니다.
 */
export interface UserPrincipal {
  /**
   * 사용자 ID
   */
  userId: string;
  
  /**
   * 테넌트 ID
   */
  tenantId: string;
  
  /**
   * 토큰 발급 시간 (issued at)
   */
  iat: number;
  
  /**
   * 토큰 만료 시간 (expiration)
   */
  exp: number;
  
  /**
   * 토큰 타입
   */
  type?: 'access' | 'refresh';
  
  /**
   * 사용자 역할 목록
   */
  roles?: string[];
  
  /**
   * 사용자 권한 목록
   */
  permissions?: string[];
}