import { PersistenceEntity } from '@core/model';

export interface IItemWallet {
  balanceItems: number;
}

export class ItemWalletEntity extends PersistenceEntity<string, IItemWallet> {
  private constructor(param: IItemWallet, id?: string) {
    super(param, id);
  }

  static of(param: IItemWallet, id?: string) {
    if (param.balanceItems == null) param.balanceItems = 0;
    return new ItemWalletEntity(param, id);
  }

  get balanceItems(): number {
    return this.etc.balanceItems;
  }

  applyDelta(amountItems: number): this {
    const next = this.etc.balanceItems + amountItems;
    if (next < 0) {
      throw new Error(`insufficient items: current=${this.etc.balanceItems}, delta=${amountItems}`);
    }
    this.etc.balanceItems = next;
    return this;
  }
}


