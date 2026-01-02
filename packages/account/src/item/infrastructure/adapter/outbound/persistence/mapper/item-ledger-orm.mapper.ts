import { ItemLedgerOrmEntity } from '@core/database';
import { ItemLedgerEntity } from '@app/item/domain/model/item-ledger';
import { ItemLedgerType, ItemReferenceType } from '@app/item/domain/enum/item-ledger';

export class ItemLedgerOrmMapper {
  static toOrm(domain: ItemLedgerEntity): ItemLedgerOrmEntity {
    if (!domain) return null as any;
    const orm = new ItemLedgerOrmEntity();
    orm.userId = domain.id;
    if (domain.ledgerId) orm.ledgerId = domain.ledgerId;
    orm.type = domain.type;
    orm.amountItems = domain.amountItems;
    orm.referenceType = domain.referenceType;
    orm.referenceId = domain.referenceId;
    orm.originalReferenceId = domain.originalReferenceId;
    orm.idempotencyKey = domain.idempotencyKey;
    orm.occurredAt = domain.occurredAt;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }

  // (optional) 역변환 필요 시 추가
  static toDomain(orm: ItemLedgerOrmEntity): ItemLedgerEntity {
    if (!orm) return null as any;
    return ItemLedgerEntity.of(
      {
        ledgerId: orm.ledgerId,
        type: orm.type as unknown as ItemLedgerType,
        amountItems: orm.amountItems,
        referenceType: orm.referenceType as unknown as ItemReferenceType,
        referenceId: orm.referenceId,
        idempotencyKey: orm.idempotencyKey,
        occurredAt: orm.occurredAt,
        originalReferenceId: orm.originalReferenceId,
      },
      orm.userId,
    ).setPersistence(orm.userId, orm.createdAt, orm.updatedAt);
  }
}


