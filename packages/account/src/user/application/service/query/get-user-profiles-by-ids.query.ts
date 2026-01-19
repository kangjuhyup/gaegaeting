import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetUserProfilesByIdsQuery,
  UserProfileWithImages,
} from '@app/user/application/port/query/get-user-profiles-by-ids.port';
import { UserProfileRepositoryPort } from '@app/user/infrastructure/port/user-profile-repository.port';
import { UserAttachmentRepositoryPort } from '@app/user/infrastructure/port/user-attachment-repository.port';
import { UserStoragePort } from '@app/user/infrastructure/port/user-storage.port';
import { UserAttachmentEntity } from '@app/user/domain/model/user-attachment';

@QueryHandler(GetUserProfilesByIdsQuery)
export class GetUserProfilesByIdsHandler
  implements IQueryHandler<GetUserProfilesByIdsQuery, Record<string, UserProfileWithImages | null>>
{
  constructor(
    private readonly userProfileRepository: UserProfileRepositoryPort,
    private readonly userAttachmentRepository: UserAttachmentRepositoryPort,
    private readonly userStoragePort: UserStoragePort,
  ) {}

  async execute(
    query: GetUserProfilesByIdsQuery,
  ): Promise<Record<string, UserProfileWithImages | null>> {
    const ids = (query.userIds ?? []).map(String).filter(Boolean);
    const uniqueIds = Array.from(new Set(ids));

    const result: Record<string, UserProfileWithImages | null> = {};
    for (const id of uniqueIds) result[id] = null;
    if (uniqueIds.length === 0) return result;

    const profiles = await this.userProfileRepository.selectUserProfilesFromIds(uniqueIds);
    if (profiles.length === 0) return result;

    const attachments = await this.userAttachmentRepository.selectUserAttachmentsFromUserIds(uniqueIds);

    const attachmentsByUserId = new Map<string, UserAttachmentEntity[]>();
    for (const a of attachments) {
      const list = attachmentsByUserId.get(a.id.userId) ?? [];
      list.push(a);
      attachmentsByUserId.set(a.id.userId, list);
    }

    for (const profile of profiles) {
      const userId = profile.id;
      const userAttachments = attachmentsByUserId.get(userId) ?? [];

      const profileImages = (
        await Promise.all(
          userAttachments.map(async (profileImage) => {
            const hasMetadata = await this.userStoragePort.hasMetadata(userId, profileImage.id.no);
            return hasMetadata ? profileImage : null;
          }),
        )
      ).filter(Boolean) as UserAttachmentEntity[];

      result[userId] = { profile, profileImages };
    }

    return result;
  }
}

