import { CommandHandler } from "@nestjs/cqrs";
import { UpdatePetCommand } from "../../port/in/command/update-pet.port";
import { PetRepositoryPort } from "@app/pet/domain/port/out/pet-repository.port";
import { ICommandHandler } from "@nestjs/cqrs";
import { PetEntity } from "@app/pet/domain/model/pet";

@CommandHandler(UpdatePetCommand)
export class UpdatePetHandler implements ICommandHandler<UpdatePetCommand> {
    constructor(
        private readonly petRepository: PetRepositoryPort,
    ) {}

    async execute(command: UpdatePetCommand): Promise<PetEntity> {
        const pet = await this.petRepository.selectPetFromId(command.id);
        if (!pet) {
            throw new Error('반려동물을 찾을 수 없습니다.');
        }
        pet.updateInfo(command.data);
        await this.petRepository.updatePet(pet);
        return pet;
    }
}