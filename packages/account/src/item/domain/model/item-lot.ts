import { ItemLotStatus } from '../enum/item-lot-status';
import { PersistenceEntity } from '@core/model';

export interface IItemLotId {
  userId: string;
  paymentId: string;
}

export interface IItemLot {
  grantedItems: number;
  remainingItems: number;
  status: ItemLotStatus;
}

export class ItemLotEntity extends PersistenceEntity<IItemLotId, IItemLot> {
  private constructor(param: IItemLot, id?: IItemLotId) {
    super(param, id);
  }

  static of(param: IItemLot, id?: IItemLotId) {
    if (param.status == null) param.status = ItemLotStatus.OPEN;
    return new ItemLotEntity(param, id);
  }

  get userId(): string {
    return this.id.userId;
  }

  get paymentId(): string {
    return this.id.paymentId;
  }

  get grantedItems(): number {
    return this.etc.grantedItems;
  }

  get remainingItems(): number {
    return this.etc.remainingItems;
  }

  get status(): ItemLotStatus {
    return this.etc.status;
  }

  spend(maxToSpend: number): number {
    if (maxToSpend <= 0) return 0;
    if (this.etc.remainingItems <= 0) return 0;

    const spent = Math.min(this.etc.remainingItems, maxToSpend);
    this.etc.remainingItems -= spent;

    if (this.etc.remainingItems === 0 && this.etc.status === ItemLotStatus.OPEN) {
      this.etc.status = ItemLotStatus.DEPLETED;
    }
    return spent;
  }

  revoke(maxToRevoke: number): number {
    if (maxToRevoke <= 0) return 0;
    if (this.etc.remainingItems <= 0) {
      this.etc.status = ItemLotStatus.REVOKED;
      return 0;
    }

    const revoked = Math.min(this.etc.remainingItems, maxToRevoke);
    this.etc.remainingItems -= revoked;
    this.etc.status = ItemLotStatus.REVOKED;
    return revoked;
  }
}


