export interface TokenFlags {
  profileRegistered?: boolean;
  phoneVerified?: boolean;
  petRegistered?: boolean;
}

export abstract class AuthApiPort {
  /**
   * 사용자 생성 후 액세스 토큰 발급
   * @param userId - 생성된 사용자 ID
   * @param socialProvider - 소셜 제공자
   * @param socialId - 소셜 ID
   * @param flags - 토큰에 포함할 상태 플래그
   * @returns 액세스 토큰
   */
  abstract createTokenForUser(
    userId: string,
    socialProvider: string,
    socialId: string,
    flags?: TokenFlags,
  ): Promise<string>;

  /**
   * Auth 엔티티에 userId 설정
   * @param providerType - 소셜 제공자 타입
   * @param providerId - 소셜 ID
   * @param userId - 사용자 ID
   */
  abstract setUserId(
    providerType: number,
    providerId: string,
    userId: string,
  ): Promise<void>;
}
