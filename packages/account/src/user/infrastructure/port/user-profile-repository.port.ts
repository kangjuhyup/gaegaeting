import { UserProfileEntity } from "../../domain/model/user-profile";

/**
 * 사용자 프로필 리포지토리 포트
 * 
 * 사용자 프로필 관련 데이터 접근을 위한 포트 인터페이스입니다.
 */
export abstract class UserProfileRepositoryPort {
  /**
   * 사용자 프로필 생성
   */
  abstract insertUserProfile(user: UserProfileEntity): Promise<UserProfileEntity>;
  
  /**
   * ID로 사용자 프로필 조회
   */
  abstract selectUserProfileFromId(id: string): Promise<UserProfileEntity>;

  /**
   * 사용자 ID 목록으로 사용자 프로필 배치 조회 (N+1 방지용)
   */
  abstract selectUserProfilesFromIds(ids: string[]): Promise<UserProfileEntity[]>;
   
  /**
   * 사용자 프로필 업데이트
   */
  abstract updateUserProfile(user: UserProfileEntity): Promise<UserProfileEntity>;
  
  /**
   * 사용자 프로필 영구 삭제
   */
  abstract hardDeleteUser(id: string): Promise<void>;
}

