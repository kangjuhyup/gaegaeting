import { Query } from '@nestjs/cqrs';
import { PetAttachemntEntity } from '@app/pet/domain/model/pet-attachment';

/**
 * 여러 petId의 첨부파일(프로필 이미지)을 배치로 조회합니다. (N+1 방지용)
 */
export class GetPetAttachmentsByPetIdsQuery extends Query<Record<number, PetAttachemntEntity[]>> {
  constructor(public readonly petIds: number[]) {
    super();
  }
}

