import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateUserIdCommand } from '../../port/command/update-user-id.port';
import { AuthRepositoryPort } from '@app/auth/domain/port/auth-repository.port';
import { Transactional } from '@core/database';

@CommandHandler(UpdateUserIdCommand)
export class UpdateUserIdCommandHandler
  implements ICommandHandler<UpdateUserIdCommand, void>
{
  constructor(private readonly authRepository: AuthRepositoryPort) {}

  @Transactional()
  async execute(command: UpdateUserIdCommand): Promise<void> {
    await this.authRepository.updateUserId(
      command.providerType,
      command.providerId,
      command.userId,
    );
  }
}
