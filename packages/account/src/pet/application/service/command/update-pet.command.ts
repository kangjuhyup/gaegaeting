import { CommandHandler } from "@nestjs/cqrs";
import { UpdatePetCommand } from "../../port/command/update-pet.port";
import { PetProfileRepositoryPort } from "@app/pet/infrastructure/port/pet-profile-repository.port";
import { ICommandHandler } from "@nestjs/cqrs";
import { PetEntity } from "@app/pet/domain/model/pet";
import { Transactional } from "@core/database";

@CommandHandler(UpdatePetCommand)
export class UpdatePetHandler implements ICommandHandler<UpdatePetCommand> {
    constructor(
        private readonly petProfileRepository: PetProfileRepositoryPort,
    ) {}

    @Transactional()
    async execute(command: UpdatePetCommand): Promise<PetEntity> {
        const pet = await this.petProfileRepository.selectPetFromId(command.id);
        if (!pet) {
            throw new Error('반려동물을 찾을 수 없습니다.');
        }
        pet.updateInfo(command.data)
        await this.petProfileRepository.updatePet(pet);
        return pet;
    }
}