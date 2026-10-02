import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { ReviewUserImageCommand } from '../../port/command/review-user-image.port.js';
import { ProfileImageService } from '../../../../common/profile-images/profile-image.service.js';

@CommandHandler(ReviewUserImageCommand)
export class ReviewUserImageHandler implements ICommandHandler<ReviewUserImageCommand, void> {
  constructor(private readonly images: ProfileImageService) {}
  async execute(command: ReviewUserImageCommand): Promise<void> {
    await this.images.reviewUserByPath(command.userId, command.path, command.approve, command.reviewerId);
  }
}
