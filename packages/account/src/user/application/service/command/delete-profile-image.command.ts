import { CommandHandler } from "@nestjs/cqrs";
import { DeleteProfileImageCommand } from "../../port/command/delete-profile-image.port";
import { ICommandHandler } from "@nestjs/cqrs";
import { UserAttachmentRepositoryPort } from "@app/user/infrastructure/port/user-attachment-repository.port";
import { UserStoragePort } from "@app/user/infrastructure/port/user-storage.port";
import { NotFoundException } from "@nestjs/common";
import { Transactional } from "@core/database";
import { DataSource } from "typeorm";

@CommandHandler(DeleteProfileImageCommand)
export class DeleteProfileImageHandler implements ICommandHandler<DeleteProfileImageCommand, void> {
    
    constructor(
        private readonly userAttachmentRepository : UserAttachmentRepositoryPort,
        private readonly userStoragePort : UserStoragePort,
        private readonly dataSource: DataSource,
    ) {}
    
    @Transactional()
    async execute(command: DeleteProfileImageCommand): Promise<void> {
        const profile = await this.userAttachmentRepository.selectUserAttachment(command.userId, command.no);
        if(!profile) {
            throw new NotFoundException('존재하지 않는 프로필 이미지 입니다.')
        }
        await this.userAttachmentRepository.deleteUserAttachment(command.userId, command.no);
        await this.userStoragePort.deleteProfileImage(command.userId, command.no);
    }
}