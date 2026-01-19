import DataLoader from 'dataloader';
import { Injectable, Scope } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetPetAttachmentsByPetIdsQuery } from '@app/pet/application/port/query/get-pet-attachments-by-pet-ids.port';
import { PetAttachemntEntity } from '@app/pet/domain/model/pet-attachment';

@Injectable({ scope: Scope.REQUEST })
export class PetAttachmentsByPetIdLoader {
  private readonly loader: DataLoader<number, PetAttachemntEntity[]>;

  constructor(private readonly queryBus: QueryBus) {
    this.loader = new DataLoader<number, PetAttachemntEntity[]>(
      async (petIds: readonly number[]) => {
        const keys = petIds.map((n) => Number(n)).filter((n) => Number.isFinite(n));
        const uniqueKeys = Array.from(new Set(keys));
        const record = await this.queryBus.execute(new GetPetAttachmentsByPetIdsQuery(uniqueKeys));
        return keys.map((petId) => record[petId] ?? []);
      },
      { cacheKeyFn: (key) => Number(key) },
    );
  }

  load(petId: number): Promise<PetAttachemntEntity[]> {
    return this.loader.load(petId);
  }
}

