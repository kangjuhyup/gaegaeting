import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RegisterPetCommand } from '../../port/command/register-pet.port';
import { PetProfileEntity } from '@app/pet/domain/model/pet-profile';
import { PetProfileRepositoryPort } from '@app/pet/infrastructure/port/pet-profile-repository.port';
import { Transactional } from '@core/database';

@CommandHandler(RegisterPetCommand)
export class RegisterPetHandler
  implements ICommandHandler<RegisterPetCommand, PetProfileEntity>
{

  constructor(
    private readonly petProfileRepository: PetProfileRepositoryPort,
  ) {}

  @Transactional()
  async execute(command: RegisterPetCommand): Promise<PetProfileEntity> {
    // 인증 로직은 certifyPet mutation으로 분리됨
    return this.petProfileRepository.insertPet(command.pet);
  }
}