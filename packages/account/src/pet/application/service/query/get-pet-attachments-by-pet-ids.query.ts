import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetPetAttachmentsByPetIdsQuery } from '@app/pet/application/port/query/get-pet-attachments-by-pet-ids.port';
import { PetAttachmentRepositoryPort } from '@app/pet/infrastructure/port/pet-attachment-repository.port';
import { PetAttachemntEntity } from '@app/pet/domain/model/pet-attachment';

@QueryHandler(GetPetAttachmentsByPetIdsQuery)
export class GetPetAttachmentsByPetIdsHandler
  implements IQueryHandler<GetPetAttachmentsByPetIdsQuery, Record<number, PetAttachemntEntity[]>>
{
  constructor(private readonly petAttachmentRepository: PetAttachmentRepositoryPort) {}

  async execute(query: GetPetAttachmentsByPetIdsQuery): Promise<Record<number, PetAttachemntEntity[]>> {
    const ids = (query.petIds ?? []).map((n) => Number(n)).filter((n) => Number.isFinite(n));
    const uniqueIds = Array.from(new Set(ids));

    const result: Record<number, PetAttachemntEntity[]> = {} as any;
    for (const id of uniqueIds) result[id] = [];
    if (uniqueIds.length === 0) return result;

    const attachments = await this.petAttachmentRepository.selectPetAttachmentsFromPetIds(uniqueIds);
    for (const a of attachments) {
      const petId = a.petId;
      if (!result[petId]) result[petId] = [];
      result[petId].push(a);
    }
    return result;
  }
}

