import { ItemLotOrmEntity } from '@core/database';

export abstract class ItemLotRepositoryPort {
  abstract insertIfNotExists(lot: ItemLotOrmEntity): Promise<void>;
  abstract findOpenLotsForUpdate(userId: string): Promise<ItemLotOrmEntity[]>;
  abstract findLotForUpdate(userId: string, paymentId: string): Promise<ItemLotOrmEntity | null>;
  abstract save(lot: ItemLotOrmEntity): Promise<ItemLotOrmEntity>;
}


