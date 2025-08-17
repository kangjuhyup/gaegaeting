import { AuthEntity } from "@app/auth/domain/model/auth";
import { UserPrincipal } from "@core/auth";
/**
 * 인증 저장소 포트
 * 
 * 인증 정보를 조회하고 저장하기 위한 아웃바운드 포트입니다.
 */
export abstract class AuthRepositoryPort {
  /**
   * 인증 정보 저장
   * 
   * @param auth 인증 엔티티
   * @returns 인증 ID
   */
  abstract saveAuth(auth: AuthEntity): Promise<AuthEntity>;
  
  /**
   * 사용자 ID와 인증 제공자로 인증 정보 조회
   * 
   * @param providerType 인증 제공자 타입
   * @param providerId 제공자 ID
   * @returns 유저 정보
   */
  abstract findUserByAuthProvider(providerType: number, providerId: string): Promise<UserPrincipal | null>;
  
  /**
   * 리프레시 토큰으로 인증 정보 조회
   * 
   * @param refreshToken 리프레시 토큰
   * @returns 인증 엔티티 (존재하지 않으면 null)
   */
  abstract findByRefreshToken(refreshToken: string): Promise<AuthEntity | null>;
  
  /**
   * 인증 정보 업데이트
   * 
   * @param providerType 인증 제공자 타입
   * @param providerId 제공자 ID
   * @param userId 사용자 ID
   * @returns 업데이트 성공 여부
   */
  abstract updateUserId(providerType:number,providerId:string, userId:string): Promise<boolean>;
}
