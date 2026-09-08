/**
 * 사용자 인증 정보
 * 
 * 중앙 issuer의 subject를 account application ID에 매핑한 내부 인증 정보입니다.
 */
export interface UserPrincipal {
  /**
   * 사용자 ID
   */
  userId: string;
  subject: string;
  
  /**
   * 테넌트 ID
   */
  tenantId: string;
  
  /**
   * 토큰 발급 시간 (issued at)
   */
  issuedAt: number;
  
  /**
   * 토큰 만료 시간 (expiration)
   */
  expiresAt: number;
  
  /**
   * 토큰 타입
   */
  scopes: string[];
  
  /**
   * 사용자 역할 목록
   */
  roles?: string[];
  
  /**
   * 사용자 권한 목록
   */
  permissions?: string[];
}
