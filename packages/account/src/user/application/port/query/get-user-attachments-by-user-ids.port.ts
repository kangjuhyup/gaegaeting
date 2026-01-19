import { Query } from '@nestjs/cqrs';
import { UserAttachmentEntity } from '@app/user/domain/model/user-attachment';

/**
 * 여러 userId의 첨부파일(프로필 이미지)을 배치로 조회합니다. (N+1 방지용)
 */
export class GetUserAttachmentsByUserIdsQuery extends Query<Record<string, UserAttachmentEntity[]>> {
  constructor(public readonly userIds: string[]) {
    super();
  }
}

