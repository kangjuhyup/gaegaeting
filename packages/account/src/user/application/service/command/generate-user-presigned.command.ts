import { PresignedUrl } from "@app/common/vo/presigned-url";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { GenerateUserPresignedCommand } from "../../port/command/generate-presigned.port";
import { UserStoragePort } from "@app/user/domain/port/user-storage.port";
import { UserRepositoryPort } from '../../../domain/port/user-repository.port';
import { UserProfileEntity } from "@app/user/domain/model/user-profile";
import { Transactional } from "@core/database";

@CommandHandler(GenerateUserPresignedCommand)
export class GenerateUserPresignedUrlHandler implements ICommandHandler<GenerateUserPresignedCommand,PresignedUrl> {

    constructor(
        private readonly userStoragePort : UserStoragePort,
        private readonly userRepositoryPort : UserRepositoryPort
    ) {}
    
    @Transactional()
    async execute(command: GenerateUserPresignedCommand): Promise<PresignedUrl> {
        const presignedUrl = await this.userStoragePort.getPresignedUrl(command.userId, command.no);
        const profile = UserProfileEntity.of({
            path : presignedUrl.path,
            active : false,
        }, {
            userId : command.userId,
            no : command.no
        });
        await this.userRepositoryPort.insertUserAttachment(profile);
        return presignedUrl;
    }
}