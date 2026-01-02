import { ItemLotOrmEntity, ItemLotStatus as OrmItemLotStatus } from '@core/database';
import { ItemLotEntity } from '@app/item/domain/model/item-lot';
import { ItemLotStatus } from '@app/item/domain/enum/item-lot-status';

export class ItemLotOrmMapper {
  static toDomain(orm: ItemLotOrmEntity): ItemLotEntity {
    if (!orm) return null as any;
    return ItemLotEntity.of(
      {
        grantedItems: orm.grantedItems,
        remainingItems: orm.remainingItems,
        status: orm.status as unknown as ItemLotStatus,
      },
      { userId: orm.userId, paymentId: orm.paymentId },
    ).setPersistence(
      { userId: orm.userId, paymentId: orm.paymentId },
      orm.createdAt,
      orm.updatedAt,
    );
  }

  static toOrm(domain: ItemLotEntity): ItemLotOrmEntity {
    if (!domain) return null as any;
    const orm = new ItemLotOrmEntity();
    orm.userId = domain.id.userId;
    orm.paymentId = domain.id.paymentId;
    orm.grantedItems = domain.grantedItems;
    orm.remainingItems = domain.remainingItems;
    orm.status = domain.status as unknown as OrmItemLotStatus;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }

  static applyToOrm(domain: ItemLotEntity, orm: ItemLotOrmEntity): void {
    if (!domain || !orm) return;
    orm.remainingItems = domain.remainingItems;
    orm.status = domain.status as unknown as OrmItemLotStatus;
  }
}


