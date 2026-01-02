import { ItemLotEntity } from '../model/item-lot';

export abstract class ItemLotRepositoryPort {
  abstract insertIfNotExists(lot: ItemLotEntity): Promise<void>;
  abstract findOpenLotsForUpdate(userId: string): Promise<ItemLotEntity[]>;
  abstract findLotForUpdate(userId: string, paymentId: string): Promise<ItemLotEntity | null>;
  abstract save(lot: ItemLotEntity): Promise<void>;
}


