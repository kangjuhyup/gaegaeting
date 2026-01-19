import DataLoader from 'dataloader';
import { Injectable, Scope } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  GetUserProfilesByIdsQuery,
  UserProfileWithImages,
} from '@app/user/application/port/query/get-user-profiles-by-ids.port';

@Injectable({ scope: Scope.REQUEST })
export class UserProfileByIdLoader {
  private readonly loader: DataLoader<string, UserProfileWithImages | null>;

  constructor(private readonly queryBus: QueryBus) {
    this.loader = new DataLoader<string, UserProfileWithImages | null>(
      async (userIds: readonly string[]) => {
        const keys = userIds.map(String).filter(Boolean);
        const uniqueKeys = Array.from(new Set(keys));
        const record = await this.queryBus.execute(new GetUserProfilesByIdsQuery(uniqueKeys));
        return keys.map((userId) => record[userId] ?? null);
      },
      { cacheKeyFn: (key) => String(key) },
    );
  }

  load(userId: string): Promise<UserProfileWithImages | null> {
    return this.loader.load(userId);
  }

  loadMany(userIds: readonly string[]): Promise<(UserProfileWithImages | null | Error)[]> {
    return this.loader.loadMany(Array.from(userIds));
  }
}

