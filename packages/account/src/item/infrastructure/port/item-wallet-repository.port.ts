import { ItemWalletOrmEntity } from '@core/database';

export abstract class ItemWalletRepositoryPort {
  /**
   * wallet row를 (없으면 생성 후) write lock으로 가져온다.
   */
  abstract getOrCreateAndLock(userId: string): Promise<ItemWalletOrmEntity>;

  abstract save(wallet: ItemWalletOrmEntity): Promise<ItemWalletOrmEntity>;
}


