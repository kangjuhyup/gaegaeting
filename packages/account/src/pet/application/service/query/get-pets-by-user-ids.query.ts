import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetPetsByUserIdsQuery, PetsWithProfiles } from '@app/pet/application/port/query/get-pets-by-user-ids.port';
import { PetProfileRepositoryPort } from '@app/pet/infrastructure/port/pet-profile-repository.port';
import { PetAttachmentRepositoryPort } from '@app/pet/infrastructure/port/pet-attachment-repository.port';

@QueryHandler(GetPetsByUserIdsQuery)
export class GetPetsByUserIdsHandler
  implements IQueryHandler<GetPetsByUserIdsQuery, Record<string, PetsWithProfiles[]>>
{
  constructor(
    private readonly petProfileRepository: PetProfileRepositoryPort,
    private readonly petAttachmentRepository: PetAttachmentRepositoryPort,
  ) {}

  async execute(query: GetPetsByUserIdsQuery): Promise<Record<string, PetsWithProfiles[]>> {
    const userIds = (query.userIds ?? []).map(String).filter(Boolean);
    const uniqueUserIds = Array.from(new Set(userIds));

    const result: Record<string, PetsWithProfiles[]> = {};
    for (const userId of uniqueUserIds) result[userId] = [];

    if (uniqueUserIds.length === 0) return result;

    const pets = await this.petProfileRepository.selectPetsFromUserIds(uniqueUserIds);
    if (pets.length === 0) return result;

    const petIds = pets.map(pet => pet.id);
    const profiles = await this.petAttachmentRepository.selectPetAttachmentsFromPetIds(petIds);

    const profilesByPetId = new Map<number, typeof profiles>();
    for (const profile of profiles) {
      const list = profilesByPetId.get(profile.petId) ?? [];
      list.push(profile);
      profilesByPetId.set(profile.petId, list);
    }

    for (const pet of pets) {
      const userId = pet.userId;
      if (!result[userId]) result[userId] = [];
      result[userId].push({
        pet,
        profile: profilesByPetId.get(pet.id) ?? [],
      });
    }

    return result;
  }
}

