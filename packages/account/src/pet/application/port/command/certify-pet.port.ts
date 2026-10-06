import { Command } from '@nestjs/cqrs';
import { PetProfileEntity } from '#app/pet/domain/model/pet-profile';
import type { UserPrincipal } from '@core/auth';

export class CertifyPetCommand extends Command<PetProfileEntity> {
  constructor(
    public readonly petId: number,
    public readonly userName: string,
    public readonly certificationCode: string,
    public readonly user: UserPrincipal,
  ) {
    super();
  }
}

