import { Query } from '@nestjs/cqrs';
import { UserProfileEntity } from '@app/user/domain/model/user-profile';
import { UserAttachmentEntity } from '@app/user/domain/model/user-attachment';

export type UserProfileWithImages = {
  profile: UserProfileEntity;
  profileImages: UserAttachmentEntity[];
};

/**
 * 여러 userId의 프로필(+프로필 이미지)을 배치로 조회합니다. (N+1 방지용)
 */
export class GetUserProfilesByIdsQuery extends Query<Record<string, UserProfileWithImages | null>> {
  constructor(public readonly userIds: string[]) {
    super();
  }
}

