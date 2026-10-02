import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { GenerateUserPresignedCommand } from '../../port/command/generate-presigned.port.js';
import { ProfileImageService } from '../../../../common/profile-images/profile-image.service.js';
import { PresignedUrl } from '../../../../common/vo/presigned-url.js';

@CommandHandler(GenerateUserPresignedCommand)
export class GenerateUserPresignedUrlHandler implements ICommandHandler<GenerateUserPresignedCommand, PresignedUrl> {
  constructor(private readonly images: ProfileImageService) {}
  async execute(command: GenerateUserPresignedCommand): Promise<PresignedUrl> {
    return this.images.begin('USER', command.userId, command.no, command.userId);
  }
}
