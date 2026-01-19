import { Query } from '@nestjs/cqrs';
import { PetProfileEntity } from '@app/pet/domain/model/pet-profile';
import { PetAttachemntEntity } from '@app/pet/domain/model/pet-attachment';

export type PetsWithProfiles = { pet: PetProfileEntity; profile: PetAttachemntEntity[] };

/**
 * 여러 사용자(userId)의 반려동물 목록을 배치로 조회합니다.
 * - N+1 방지를 위해 DataLoader batch 함수에서 사용합니다.
 */
export class GetPetsByUserIdsQuery extends Query<Record<string, PetsWithProfiles[]>> {
  constructor(public readonly userIds: string[]) {
    super();
  }
}

