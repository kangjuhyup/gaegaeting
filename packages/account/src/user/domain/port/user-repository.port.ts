import { UserAttachmentEntity } from "../model/user-attachment";
import { UserProfileEntity } from "../model/user-profile";

export abstract class UserRepositoryPort {
  abstract insertUserProfile(user: UserProfileEntity): Promise<UserProfileEntity>;
  abstract selectUserProfileFromId(id: string): Promise<UserProfileEntity>;

  abstract selectUserProfileFromPhone(phoneNumber: string): Promise<UserProfileEntity>;

  abstract updateUserProfile(user: UserProfileEntity): Promise<UserProfileEntity>;
  abstract hardDeleteUser(id: string): Promise<void>;

  abstract selectUserAttachment(userId: string, no : number) : Promise<UserAttachmentEntity>
  abstract selectUserAttachments(userId: string) : Promise<UserAttachmentEntity[]>
  abstract insertUserAttachment(userAttachment : UserAttachmentEntity) : Promise<UserAttachmentEntity>
  abstract updateUserAttachment(userAttachment : UserAttachmentEntity) : Promise<UserAttachmentEntity>
  /**
   * 사용자 첨부파일의 활성화 상태를 직접 업데이트합니다.
   * TypeORM의 update() 메서드를 사용하여 SELECT 없이 직접 UPDATE를 수행합니다.
   * 
   * @param userId 사용자 ID
   * @param no 첨부파일 번호
   * @param active 활성화 상태
   */
  abstract updateUserAttachmentActive(userId: string, no: number, active: boolean): Promise<void>
  abstract deleteUserAttachment(userId: string, no : number) : Promise<void>
}
