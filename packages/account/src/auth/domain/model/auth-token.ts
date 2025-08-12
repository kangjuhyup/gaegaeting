/**
 * 인증 토큰 도메인 모델
 * 
 * 인증 토큰 관련 정보를 담는 도메인 모델입니다.
 */
export class AuthToken {
  /**
   * 액세스 토큰
   */
  private readonly accessToken: string;
  
  /**
   * 리프레시 토큰
   */
  private readonly refreshToken: string;
  
  /**
   * 토큰 만료 시간 (초)
   */
  private readonly expiresIn: number;
  
  /**
   * 리프레시 토큰 만료 시간 (초)
   */
  private readonly refreshTokenExpiresIn: number;

  /**
   * 토큰 타입 (예: Bearer)
   */
  private readonly tokenType: string;
  
  constructor(
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    refreshTokenExpiresIn : number,
    tokenType: string = 'Bearer',
  ) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresIn = expiresIn;
    this.refreshTokenExpiresIn = refreshTokenExpiresIn;
    this.tokenType = tokenType;
  }
  
  /**
   * 액세스 토큰 반환
   */
  getAccessToken(): string {
    return this.accessToken;
  }
  
  /**
   * 리프레시 토큰 반환
   */
  getRefreshToken(): string {
    return this.refreshToken;
  }
  
  /**
   * 토큰 만료 시간 반환 (초)
   */
  getExpiresIn(): number {
    return this.expiresIn;
  }

  /**
   * 리프레시 토큰 만료 시간 반환 (초)
   */
  getRefreshTokenExpiresIn(): number {
    return this.refreshTokenExpiresIn;
  }
  
  /**
   * 토큰 타입 반환
   */
  getTokenType(): string {
    return this.tokenType;
  }
  
  /**
   * 완전한 인증 헤더 값 반환 (예: "Bearer abc123...")
   */
  getAuthorizationHeader(): string {
    return `${this.tokenType} ${this.accessToken}`;
  }
}
