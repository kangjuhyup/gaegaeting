import { SocialUserProfile } from "@app/auth/domain/model/auth-provider";
import { AuthProvider } from "../../model/type/auth-provider.type";

/**
 * 사용자 저장소 포트
 * 
 * 사용자 정보를 조회하고 저장하기 위한 아웃바운드 포트입니다.
 */
export abstract class UserRepositoryPort {
  /**
   * 소셜 로그인 ID로 사용자 조회
   * 
   * @param provider 인증 제공자
   * @param providerId 제공자 ID
   * @returns 사용자 ID (존재하지 않으면 null)
   */
  abstract findUserIdBySocialId(provider: AuthProvider, providerId: string): Promise<string | null>;
  
  /**
   * 소셜 로그인 사용자 생성 또는 업데이트
   * 
   * @param profile 소셜 사용자 프로필
   * @returns 사용자 ID
   */
  abstract createOrUpdateSocialUser(profile: SocialUserProfile): Promise<string>;
}
