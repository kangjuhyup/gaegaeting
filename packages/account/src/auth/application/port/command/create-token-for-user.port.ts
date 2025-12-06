import { AuthProvider } from '@core/auth';
import { Command } from '@nestjs/cqrs';

export interface TokenFlags {
  profileRegistered?: boolean;
  phoneVerified?: boolean;
  petRegistered?: boolean;
}

export class CreateTokenForUserCommand extends Command<string> {
  constructor(
    public readonly userId: string,
    public readonly socialProvider: AuthProvider,
    public readonly socialId: string,
    public readonly flags?: TokenFlags,
  ) {
    super();
  }
}
