import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateTokenForUserCommand } from '../../port/command/create-token-for-user.port';
import { JwtPort } from '@app/auth/domain/port/jwt.port';

@CommandHandler(CreateTokenForUserCommand)
export class CreateTokenForUserCommandHandler
  implements ICommandHandler<CreateTokenForUserCommand, string>
{
  constructor(private readonly jwtPort: JwtPort) {}

  async execute(command: CreateTokenForUserCommand): Promise<string> {
    const accessToken = await this.jwtPort.createAccessToken({
      userId: command.userId,
      provider: command.socialProvider,
      providerId: command.socialId,
      profileRegistered: command.flags?.profileRegistered || false,
      phoneVerified: command.flags?.phoneVerified || false,
      petRegistered: command.flags?.petRegistered || false,
    });

    return accessToken;
  }
}
