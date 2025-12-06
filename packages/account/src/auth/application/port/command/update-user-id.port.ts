import { Command } from '@core/model';

export class UpdateUserIdCommand extends Command<void> {
  constructor(
    public readonly providerType: number,
    public readonly providerId: string,
    public readonly userId: string,
  ) {
    super();
  }
}
