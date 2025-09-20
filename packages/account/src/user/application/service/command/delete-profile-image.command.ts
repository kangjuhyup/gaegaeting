import { CommandHandler } from "@nestjs/cqrs";
import { DeleteProfileImageCommand } from "../../port/command/delete-profile-image.port";
import { ICommandHandler } from "@nestjs/cqrs";
import { UserRepositoryPort } from "@app/user/domain/port/user-repository.port";
import { UserStoragePort } from "@app/user/domain/port/user-storage.port";
import { NotFoundException } from "@nestjs/common";
import { Transactional } from "@core/database";

@CommandHandler(DeleteProfileImageCommand)
export class DeleteProfileImageHandler implements ICommandHandler<DeleteProfileImageCommand, void> {
    
    constructor(
        private readonly userRepositoryPort : UserRepositoryPort,
        private readonly userStoragePort : UserStoragePort
    ) {}
    
    @Transactional()
    async execute(command: DeleteProfileImageCommand): Promise<void> {
        const profile = await this.userRepositoryPort.selectUserAttachment(command.userId, command.no);
        if(!profile) {
            throw new NotFoundException('존재하지 않는 프로필 이미지 입니다.')
        }
        await this.userRepositoryPort.deleteUserAttachment(command.userId, command.no);
        await this.userStoragePort.deleteProfileImage(command.userId, command.no);
    }
}