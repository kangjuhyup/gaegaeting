import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { ReviewUserImageCommand } from "../../port/command/review-user-image.port";
import { UserProfileRepositoryPort } from "@app/user/infrastructure/port/user-profile-repository.port";
import { UserAttachmentRepositoryPort } from "@app/user/infrastructure/port/user-attachment-repository.port";
import { UserStoragePort } from "@app/user/infrastructure/port/user-storage.port";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { Transactional } from "@core/database";

@CommandHandler(ReviewUserImageCommand)
export class ReviewUserImageHandler implements ICommandHandler<ReviewUserImageCommand,void> {
    
    constructor(
        private readonly userProfileRepository: UserProfileRepositoryPort,
        private readonly userAttachmentRepository: UserAttachmentRepositoryPort,
        private readonly userStorage : UserStoragePort
    ) {}
    
    @Transactional()
    async execute(command: ReviewUserImageCommand): Promise<void> {
        const { userId , path , approve } = command;
        const profile = await this.userProfileRepository.selectUserProfileFromId(userId);
        if (!profile) {
            throw new NotFoundException("유저를 찾을 수 없습니다.");
        }
        const attachments = await this.userAttachmentRepository.selectUserAttachments(userId);
        const image = attachments.find((a) => a.path === path);
        if (!image) {
            throw new NotFoundException("프로필을 찾을 수 없습니다.");
        }
        if(image.active) {
            throw new ConflictException('이미 활성화된 이미지입니다.')
        }
        const hasMetadata = await this.userStorage.hasMetadata(userId, image.id.no);
        if(!hasMetadata) {
            throw new NotFoundException('이미지 메타데이터가 존재하지 않습니다.')
        }
        if(approve) {
            await this.userAttachmentRepository.updateUserAttachmentActive(userId, image.id.no, true);
        } else {
            await this.userAttachmentRepository.deleteUserAttachment(userId, image.id.no);
            await this.userStorage.deleteProfileImage(userId,image.id.no)
        }
    }
}