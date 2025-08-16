import { PresignedUrl } from "@app/user/domain/vo/presigned-url";
import { CommandHandler, ICommandHandler, IQueryHandler } from "@nestjs/cqrs";
import { GeneratePresignedCommand } from "../../port/in/command/generate-presigned.port";
import { UserStoragePort } from "@app/user/domain/port/out/user-storage.port";
import { UserRepositoryPort } from '../../../domain/port/out/user-repository.port';
import { ProfileEntity } from "@app/user/domain/model/profile";

@CommandHandler(GeneratePresignedCommand)
export class GeneratePresignedUrlHandler implements ICommandHandler<GeneratePresignedCommand,PresignedUrl> {

    constructor(
        private readonly userStoragePort : UserStoragePort,
        private readonly userRepositoryPort : UserRepositoryPort
    ) {}
    
    async execute(command: GeneratePresignedCommand): Promise<PresignedUrl> {
        const presignedUrl = await this.userStoragePort.getPresignedUrl(command.userId, command.no);
        const profile = ProfileEntity.of({
            path : presignedUrl.path,
            active : false,
        });
        await this.userRepositoryPort.insertUserAttachment(profile);
        return presignedUrl;
    }
}