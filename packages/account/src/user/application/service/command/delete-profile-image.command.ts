import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { DeleteProfileImageCommand } from '../../port/command/delete-profile-image.port.js';
import { ProfileImageService } from '../../../../common/profile-images/profile-image.service.js';

@CommandHandler(DeleteProfileImageCommand)
export class DeleteProfileImageHandler implements ICommandHandler<DeleteProfileImageCommand, void> {
  constructor(private readonly images: ProfileImageService) {}
  async execute(command: DeleteProfileImageCommand): Promise<void> {
    await this.images.remove('USER', command.userId, command.no, command.userId);
  }
}
