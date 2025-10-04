import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { ReviewUserImageCommand } from "../../port/command/review-user-image.port";
import { UserRepositoryPort } from "@app/user/domain/port/user-repository.port";
import { UserStoragePort } from "@app/user/domain/port/user-storage.port";
import { ConflictException, NotFoundException } from "@nestjs/common";

@CommandHandler(ReviewUserImageCommand)
export class ReviewUserImageCommandHandler implements ICommandHandler<ReviewUserImageCommand,void> {
    
    constructor(
        private readonly userRepository : UserRepositoryPort,
        private readonly userStorage : UserStoragePort
    ) {}
    
    async execute(command: ReviewUserImageCommand): Promise<void> {
        const { userId , path , approve } = command;
        const user = await this.userRepository.selectUserFromIdWithProfiles(userId);
        const image = user.profiles.find((p) => p.path === path)
        if (!user || !image) {
            throw new NotFoundException("프로필을 찾을 수 없습니다.");
        }
        if(image.isActive) {
            throw new ConflictException('이미 활성화된 이미지입니다.')
        }
        const hasMetadata = await this.userStorage.hasMetadata(userId, image.id.no);
        if(!hasMetadata) {
            throw new NotFoundException('이미지 메타데이터가 존재하지 않습니다.')
        }
        if(approve) {
            image.isActive = true;
            await this.userRepository.updateUserAttachmentActive(userId, image.id.no, true);
        } else {
            await this.userRepository.deleteUserAttachment(userId, image.id.no);
            await this.userStorage.deleteProfileImage(userId,image.id.no)
        }
    }
}