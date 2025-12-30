import { CommandHandler } from "@nestjs/cqrs";
import { GeneratePetPresignedCommand } from "../../port/command/generate-pet-presigned.port";
import { PetStoragePort } from "@app/pet/infrastructure/port/pet-storage.port";
import { PetAttachmentRepositoryPort } from "@app/pet/infrastructure/port/pet-attachment-repository.port";
import { PresignedUrl } from "@app/common/vo/presigned-url";
import { ICommandHandler } from "@nestjs/cqrs";
import { PetProfileEntity } from "@app/pet/domain/model/pet-profile";
import { Transactional } from "@core/database";
import { DataSource } from "typeorm";

@CommandHandler(GeneratePetPresignedCommand)
export class GeneratePetPresignedUrlHandler implements ICommandHandler<GeneratePetPresignedCommand,PresignedUrl> {

    constructor(
        private readonly petStoragePort : PetStoragePort,
        private readonly petAttachmentRepositoryPort : PetAttachmentRepositoryPort,
        private readonly dataSource: DataSource,
    ) {}
    
    @Transactional()
    async execute(command: GeneratePetPresignedCommand): Promise<PresignedUrl> {
        const presignedUrl = await this.petStoragePort.getPresignedUrl(command.petId, command.no);
        const pet = PetProfileEntity.of({
            path : presignedUrl.path,
            active : false,
        });
        await this.petAttachmentRepositoryPort.insertPetAttachment(pet);
        return presignedUrl;
    }
}