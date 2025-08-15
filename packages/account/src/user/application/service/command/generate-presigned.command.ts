import { PresignedUrl } from "@app/user/domain/vo/presigned-url";
import { ICommandHandler, IQueryHandler } from "@nestjs/cqrs";
import { GeneratePresignedCommand } from "../../port/in/command/generate-presigned.port";
import { UserStoragePort } from "@app/user/domain/port/out/user-storage.port";
import { UserRepositoryPort } from '../../../domain/port/out/user-repository.port';
import { ProfileEntity } from "@app/user/domain/model/profile";

export class GeneratePresignedUrlHandler implements ICommandHandler<GeneratePresignedCommand,PresignedUrl> {

    constructor(
        private readonly userStoragePort : UserStoragePort,
        private readonly userRepositoryPort : UserRepositoryPort
    ) {}
    
    execute(command: GeneratePresignedCommand): Promise<PresignedUrl> {
        const presignedUrl = this.userStoragePort.getPresignedUrl(command.userId, command.no);
        const profile = ProfileEntity.of({
            //TODO: storage 에 실제 저장될 Url 을 저장한다.
            path : '',
            active : false,
        })
        this.userRepositoryPort.insertUserAttachment(profile);
        return presignedUrl;
    }
}