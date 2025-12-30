import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RegisterPetCommand } from '../../port/command/register-pet.port';
import { PetEntity } from '@app/pet/domain/model/pet';
import { PetProfileRepositoryPort } from '@app/pet/infrastructure/port/pet-profile-repository.port';
import { Transactional } from '@core/database';
import { DataSource } from 'typeorm';

@CommandHandler(RegisterPetCommand)
export class RegisterPetHandler
  implements ICommandHandler<RegisterPetCommand, PetEntity>
{

  constructor(
    private readonly petProfileRepository: PetProfileRepositoryPort,
    private readonly dataSource: DataSource,
  ) {}

  @Transactional()
  async execute(command: RegisterPetCommand): Promise<PetEntity> {
    // 인증 로직은 certifyPet mutation으로 분리됨
    return this.petProfileRepository.insertPet(command.pet);
  }
}