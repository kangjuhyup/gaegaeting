import { CommandHandler } from "@nestjs/cqrs";
import { GeneratePetPresignedCommand } from "../../port/in/command/generate-pet-presigned.port";
import { PetStoragePort } from "@app/pet/domain/port/out/pet-storage.port";
import { PetRepositoryPort } from "@app/pet/domain/port/out/pet-repository.port";
import { PresignedUrl } from "@app/common/vo/presigned-url";
import { ICommandHandler } from "@nestjs/cqrs";
import { PetProfileEntity } from "@app/pet/domain/model/pet-profile";

@CommandHandler(GeneratePetPresignedCommand)
export class GeneratePetPresignedUrlHandler implements ICommandHandler<GeneratePetPresignedCommand,PresignedUrl> {

    constructor(
        private readonly petStoragePort : PetStoragePort,
        private readonly petRepositoryPort : PetRepositoryPort
    ) {}
    
    async execute(command: GeneratePetPresignedCommand): Promise<PresignedUrl> {
        const presignedUrl = await this.petStoragePort.getPresignedUrl(command.petId, command.no);
        const pet = PetProfileEntity.of({
            path : presignedUrl.path,
            active : false,
        });
        await this.petRepositoryPort.insertPetAttachment(pet);
        return presignedUrl;
    }
}