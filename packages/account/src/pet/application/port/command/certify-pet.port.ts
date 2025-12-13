import { Command } from '@nestjs/cqrs';
import { PetEntity } from '@app/pet/domain/model/pet';

export class CertifyPetCommand extends Command<PetEntity> {
  constructor(
    public readonly petId: number,
    public readonly userName: string,
    public readonly certificationCode: string,
  ) {
    super();
  }
}


