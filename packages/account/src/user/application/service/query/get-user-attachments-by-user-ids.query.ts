import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUserAttachmentsByUserIdsQuery } from '@app/user/application/port/query/get-user-attachments-by-user-ids.port';
import { UserAttachmentRepositoryPort } from '@app/user/infrastructure/port/user-attachment-repository.port';
import { UserStoragePort } from '@app/user/infrastructure/port/user-storage.port';
import { UserAttachmentEntity } from '@app/user/domain/model/user-attachment';

@QueryHandler(GetUserAttachmentsByUserIdsQuery)
export class GetUserAttachmentsByUserIdsHandler
  implements IQueryHandler<GetUserAttachmentsByUserIdsQuery, Record<string, UserAttachmentEntity[]>>
{
  constructor(
    private readonly userAttachmentRepository: UserAttachmentRepositoryPort,
    private readonly userStoragePort: UserStoragePort,
  ) {}

  async execute(query: GetUserAttachmentsByUserIdsQuery): Promise<Record<string, UserAttachmentEntity[]>> {
    const ids = (query.userIds ?? []).map(String).filter(Boolean);
    const uniqueIds = Array.from(new Set(ids));

    const result: Record<string, UserAttachmentEntity[]> = {};
    for (const id of uniqueIds) result[id] = [];
    if (uniqueIds.length === 0) return result;

    const attachments = await this.userAttachmentRepository.selectUserAttachmentsFromUserIds(uniqueIds);
    if (attachments.length === 0) return result;

    const byUserId = new Map<string, UserAttachmentEntity[]>();
    for (const a of attachments) {
      const list = byUserId.get(a.id.userId) ?? [];
      list.push(a);
      byUserId.set(a.id.userId, list);
    }

    // 기존 GetUserProfileHandler와 동일하게 hasMetadata 체크 후 반환
    for (const userId of uniqueIds) {
      const list = byUserId.get(userId) ?? [];
      const filtered = (
        await Promise.all(
          list.map(async (a) => {
            const ok = await this.userStoragePort.hasMetadata(userId, a.id.no);
            return ok ? a : null;
          }),
        )
      ).filter(Boolean) as UserAttachmentEntity[];
      result[userId] = filtered;
    }

    return result;
  }
}

