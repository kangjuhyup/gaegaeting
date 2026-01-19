import { UserAttachmentEntity } from "../../domain/model/user-attachment";

/**
 * 사용자 첨부파일 리포지토리 포트
 * 
 * 사용자 첨부파일(프로필 이미지) 관련 데이터 접근을 위한 포트 인터페이스입니다.
 */
export abstract class UserAttachmentRepositoryPort {
  /**
   * 사용자 첨부파일 조회
   * 
   * @param userId 사용자 ID
   * @param no 첨부파일 번호
   */
  abstract selectUserAttachment(userId: string, no: number): Promise<UserAttachmentEntity>;
  
  /**
   * 사용자의 모든 첨부파일 조회
   * 
   * @param userId 사용자 ID
   */
  abstract selectUserAttachments(userId: string): Promise<UserAttachmentEntity[]>;

  /**
   * 사용자 ID 목록으로 첨부파일 배치 조회 (N+1 방지용)
   */
  abstract selectUserAttachmentsFromUserIds(userIds: string[]): Promise<UserAttachmentEntity[]>;
  
  /**
   * 사용자 첨부파일 생성
   */
  abstract insertUserAttachment(userAttachment: UserAttachmentEntity): Promise<UserAttachmentEntity>;
  
  /**
   * 사용자 첨부파일 업데이트
   */
  abstract updateUserAttachment(userAttachment: UserAttachmentEntity): Promise<UserAttachmentEntity>;
  
  /**
   * 사용자 첨부파일의 활성화 상태를 직접 업데이트합니다.
   * TypeORM의 update() 메서드를 사용하여 SELECT 없이 직접 UPDATE를 수행합니다.
   * 
   * @param userId 사용자 ID
   * @param no 첨부파일 번호
   * @param active 활성화 상태
   */
  abstract updateUserAttachmentActive(userId: string, no: number, active: boolean): Promise<void>;
  
  /**
   * 사용자 첨부파일 삭제
   */
  abstract deleteUserAttachment(userId: string, no: number): Promise<void>;
}

