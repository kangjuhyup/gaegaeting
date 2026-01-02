import { ItemWalletOrmEntity } from '@core/database';
import { ItemWalletEntity } from '@app/item/domain/model/item-wallet';

export class ItemWalletOrmMapper {
  static toDomain(orm: ItemWalletOrmEntity): ItemWalletEntity {
    if (!orm) return null as any;
    return ItemWalletEntity.of(
      { balanceItems: orm.balanceItems },
      orm.userId,
    ).setPersistence(orm.userId, orm.createdAt, orm.updatedAt);
  }

  static toOrm(domain: ItemWalletEntity): ItemWalletOrmEntity {
    if (!domain) return null as any;
    const orm = new ItemWalletOrmEntity();
    orm.userId = domain.id;
    orm.balanceItems = domain.balanceItems;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }

  static applyToOrm(domain: ItemWalletEntity, orm: ItemWalletOrmEntity): void {
    if (!domain || !orm) return;
    orm.balanceItems = domain.balanceItems;
  }
}


