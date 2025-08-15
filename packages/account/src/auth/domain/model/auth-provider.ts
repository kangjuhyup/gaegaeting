import { AuthProvider } from "@core/auth";

/**
 * 소셜 로그인 사용자 정보
 * 
 * 소셜 로그인 제공자로부터 받은 사용자 정보를 표준화한 모델입니다.
 */
export class SocialUserProfile {
  /**
   * 소셜 로그인 제공자
   */
  private readonly provider: AuthProvider;
  
  /**
   * 소셜 로그인 제공자의 고유 ID
   */
  private readonly providerId: string;
  
  /**
   * 이메일 주소
   */
  private readonly email: string | null;
  
  /**
   * 이름 또는 닉네임
   */
  private readonly name: string | null;
  
  /**
   * 프로필 이미지 URL
   */
  private readonly profileImage: string | null;
  
  constructor(
    provider: AuthProvider,
    providerId: string,
    email: string | null = null,
    name: string | null = null,
    profileImage: string | null = null,
  ) {
    this.provider = provider;
    this.providerId = providerId;
    this.email = email;
    this.name = name;
    this.profileImage = profileImage;
  }
  
  /**
   * 인증 제공자 반환
   */
  getProvider(): AuthProvider {
    return this.provider;
  }
  
  /**
   * 제공자 ID 반환
   */
  getProviderId(): string {
    return this.providerId;
  }
  
  /**
   * 이메일 반환
   */
  getEmail(): string | null {
    return this.email;
  }
  
  /**
   * 이름 반환
   */
  getName(): string | null {
    return this.name;
  }
  
  /**
   * 프로필 이미지 URL 반환
   */
  getProfileImage(): string | null {
    return this.profileImage;
  }
  
  /**
   * 고유 식별자 생성 (provider:providerId 형식)
   */
  getUniqueIdentifier(): string {
    return `${this.provider}:${this.providerId}`;
  }
}
