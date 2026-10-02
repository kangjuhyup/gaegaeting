import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { GeneratePetPresignedCommand } from '../../port/command/generate-pet-presigned.port.js';
import { ProfileImageService } from '../../../../common/profile-images/profile-image.service.js';
import { PresignedUrl } from '../../../../common/vo/presigned-url.js';

@CommandHandler(GeneratePetPresignedCommand)
export class GeneratePetPresignedUrlHandler implements ICommandHandler<GeneratePetPresignedCommand, PresignedUrl> {
  constructor(private readonly images: ProfileImageService) {}
  execute(command: GeneratePetPresignedCommand): Promise<PresignedUrl> {
    return this.images.begin('PET', String(command.petId), command.no, command.userId);
  }
}
