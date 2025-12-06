export interface TokenFlags {
  profileRegistered?: boolean;
  phoneVerified?: boolean;
  petRegistered?: boolean;
}

export abstract class AuthApiPort {
  /**
   * 펫 등록 후 액세스 토큰 발급
   * @param userId - 사용자 ID
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
}
