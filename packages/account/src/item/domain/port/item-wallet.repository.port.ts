import { ItemWalletEntity } from '../model/item-wallet';

export abstract class ItemWalletRepositoryPort {
  abstract getOrCreateAndLock(userId: string): Promise<ItemWalletEntity>;
  abstract save(wallet: ItemWalletEntity): Promise<void>;
}


