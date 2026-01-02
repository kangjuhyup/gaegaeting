import { AccountItemDeltaV1 } from '../../../infrastructure/adapter/inbound/kafka/dto/account-item-delta.v1';

export class ApplyItemDeltaCommand {
  constructor(public readonly payload: AccountItemDeltaV1) {}
}


