import { Command } from '@nestjs/cqrs';
import { PetProfileEntity } from '@app/pet/domain/model/pet-profile';

export class CertifyPetCommand extends Command<PetProfileEntity> {
  constructor(
    public readonly petId: number,
    public readonly userName: string,
    public readonly certificationCode: string,
  ) {
    super();
  }
}


