import { PresignedUrl } from "@app/common/vo/presigned-url";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { GenerateUserPresignedCommand } from "../../port/command/generate-presigned.port";
import { UserAttachmentRepositoryPort } from '@app/user/infrastructure/port/user-attachment-repository.port';
import { Transactional } from "@core/database";
import { UserAttachmentEntity } from "@app/user/domain/model/user-attachment";
import { UserStoragePort } from "@app/user/infrastructure/port/user-storage.port";
import { DataSource } from "typeorm";

@CommandHandler(GenerateUserPresignedCommand)
export class GenerateUserPresignedUrlHandler implements ICommandHandler<GenerateUserPresignedCommand,PresignedUrl> {

    constructor(
        private readonly userStoragePort : UserStoragePort,
        private readonly userAttachmentRepository : UserAttachmentRepositoryPort,
        private readonly dataSource: DataSource,
    ) {}
    
    @Transactional()
    async execute(command: GenerateUserPresignedCommand): Promise<PresignedUrl> {
        const presignedUrl = await this.userStoragePort.getPresignedUrl(command.userId, command.no);
        const profile = UserAttachmentEntity.of({
            path : presignedUrl.path,
            active : false,
        }, {
            userId : command.userId,
            no : command.no
        });
        await this.userAttachmentRepository.insertUserAttachment(profile);
        return presignedUrl;
    }
}