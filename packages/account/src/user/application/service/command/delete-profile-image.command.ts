import { CommandHandler } from "@nestjs/cqrs";
import { DeleteProfileImageCommand } from "../../port/in/command/delete-profile-image.port";
import { ICommandHandler } from "@nestjs/cqrs";
import { UserRepositoryPort } from "@app/user/domain/port/out/user-repository.port";
import { UserStoragePort } from "@app/user/domain/port/out/user-storage.port";

@CommandHandler(DeleteProfileImageCommand)
export class DeleteProfileImageHandler implements ICommandHandler<DeleteProfileImageCommand, void> {
    
    constructor(
        private readonly userRepositoryPort : UserRepositoryPort,
        private readonly userStoragePort : UserStoragePort
    ) {}
    
    async execute(command: DeleteProfileImageCommand): Promise<void> {
        await this.userStoragePort.deletePresignedUrl(command.userId, command.no);
        await this.userRepositoryPort.deleteUserAttachment(command.userId, command.no);
    }
}