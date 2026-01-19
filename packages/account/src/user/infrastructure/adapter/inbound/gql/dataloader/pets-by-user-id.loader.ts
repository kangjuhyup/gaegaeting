import DataLoader from 'dataloader';
import { Injectable, Scope } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  GetPetsByUserIdsQuery,
  PetsWithProfiles,
} from '@app/pet/application/port/query/get-pets-by-user-ids.port';

/**
 * UserProfile.pets N+1 방지용 DataLoader (request scope).
 * - 한 request 내에서 userId들을 묶어 GetPetsByUserIdsQuery로 배치 조회합니다.
 */
@Injectable({ scope: Scope.REQUEST })
export class PetsByUserIdLoader {
  private readonly loader: DataLoader<string, PetsWithProfiles[]>;

  constructor(private readonly queryBus: QueryBus) {
    this.loader = new DataLoader<string, PetsWithProfiles[]>(
      async (userIds: readonly string[]) => {
        const keys = userIds.map((userId: string) => String(userId)).filter(Boolean);
        const uniqueKeys = Array.from(new Set(keys));
        const record = await this.queryBus.execute(new GetPetsByUserIdsQuery(uniqueKeys));
        return keys.map((userId: string) => record[userId] ?? []);
      },
      {
        cacheKeyFn: (key) => String(key),
      },
    );
  }

  load(userId: string): Promise<PetsWithProfiles[]> {
    return this.loader.load(userId);
  }

  loadMany(userIds: readonly string[]): Promise<(PetsWithProfiles[] | Error)[]> {
    return this.loader.loadMany(Array.from(userIds));
  }
}

