import { ItemLedgerType, ItemReferenceType } from '../enum/item-ledger';
import { PersistenceEntity } from '@core/model';

export interface IItemLedger {
  ledgerId?: string;
  type: ItemLedgerType;
  amountItems: number;
  referenceType: ItemReferenceType;
  referenceId: string;
  originalReferenceId?: string;
  idempotencyKey: string;
  occurredAt: Date;
}

export class ItemLedgerEntity extends PersistenceEntity<string, IItemLedger> {
  private constructor(param: IItemLedger, id?: string) {
    super(param, id);
  }

  static of(param: IItemLedger, id?: string) {
    return new ItemLedgerEntity(param, id);
  }

  get ledgerId(): string | undefined {
    return this.etc.ledgerId;
  }

  get type(): ItemLedgerType {
    return this.etc.type;
  }

  get amountItems(): number {
    return this.etc.amountItems;
  }

  get referenceType(): ItemReferenceType {
    return this.etc.referenceType;
  }

  get referenceId(): string {
    return this.etc.referenceId;
  }

  get originalReferenceId(): string | undefined {
    return this.etc.originalReferenceId;
  }

  get idempotencyKey(): string {
    return this.etc.idempotencyKey;
  }

  get occurredAt(): Date {
    return this.etc.occurredAt;
  }
}


