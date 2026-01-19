import DataLoader from 'dataloader';
import { Injectable, Scope } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetUserAttachmentsByUserIdsQuery } from '@app/user/application/port/query/get-user-attachments-by-user-ids.port';
import { UserAttachmentEntity } from '@app/user/domain/model/user-attachment';

@Injectable({ scope: Scope.REQUEST })
export class UserAttachmentsByUserIdLoader {
  private readonly loader: DataLoader<string, UserAttachmentEntity[]>;

  constructor(private readonly queryBus: QueryBus) {
    this.loader = new DataLoader<string, UserAttachmentEntity[]>(
      async (userIds: readonly string[]) => {
        const keys = userIds.map(String).filter(Boolean);
        const uniqueKeys = Array.from(new Set(keys));
        const record = await this.queryBus.execute(new GetUserAttachmentsByUserIdsQuery(uniqueKeys));
        return keys.map((userId) => record[userId] ?? []);
      },
      { cacheKeyFn: (key) => String(key) },
    );
  }

  load(userId: string): Promise<UserAttachmentEntity[]> {
    return this.loader.load(userId);
  }
}

