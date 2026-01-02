import { Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApplyItemDeltaCommand } from '../../../../application/port/command/apply-item-delta.port';
import { AccountItemDeltaV1 } from './dto/account-item-delta.v1';

@Injectable()
export class AccountItemDeltaConsumer {
  private readonly logger = new Logger(AccountItemDeltaConsumer.name);

  constructor(private readonly commandBus: CommandBus) {}

  async handle(payload: AccountItemDeltaV1): Promise<void> {
    try {
      await this.commandBus.execute(new ApplyItemDeltaCommand(payload));
    } catch (e: any) {
      this.logger.error(`apply failed: ${e?.message}`);
      throw e;
    }
  }
}


