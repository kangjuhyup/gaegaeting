import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { RegisterPetCommand } from "../../port/in/command/register-pet.port";
import { PetEntity } from "@app/pet/domain/model/pet";
import { PetRepositoryPort } from "@app/pet/domain/port/out/pet-repository.port";

@CommandHandler(RegisterPetCommand)
export class RegisterPetHandler implements ICommandHandler<RegisterPetCommand,PetEntity> {

    constructor(
        private readonly petRepository : PetRepositoryPort
    ) {}
    execute(command: RegisterPetCommand): Promise<PetEntity> {
        return this.petRepository.insertPet(command.pet);
    }
}