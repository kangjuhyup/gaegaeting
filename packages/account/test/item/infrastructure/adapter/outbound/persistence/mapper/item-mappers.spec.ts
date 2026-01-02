import { ItemLedgerOrmMapper } from '@app/item/infrastructure/adapter/outbound/persistence/mapper/item-ledger-orm.mapper';
import { ItemLotOrmMapper } from '@app/item/infrastructure/adapter/outbound/persistence/mapper/item-lot-orm.mapper';
import { ItemWalletOrmMapper } from '@app/item/infrastructure/adapter/outbound/persistence/mapper/item-wallet-orm.mapper';
import { ItemLedgerEntity } from '@app/item/domain/model/item-ledger';
import { ItemLotEntity } from '@app/item/domain/model/item-lot';
import { ItemWalletEntity } from '@app/item/domain/model/item-wallet';
import { ItemLedgerType, ItemReferenceType } from '@app/item/domain/enum/item-ledger';
import { ItemLotStatus } from '@app/item/domain/enum/item-lot-status';

describe('Item mappers (UNIT)', () => {
  it('null-safe', () => {
    expect(ItemLedgerOrmMapper.toOrm(null as any)).toBeNull();
    expect(ItemLedgerOrmMapper.toDomain(null as any)).toBeNull();
    expect(ItemLotOrmMapper.toOrm(null as any)).toBeNull();
    expect(ItemLotOrmMapper.toDomain(null as any)).toBeNull();
    expect(ItemWalletOrmMapper.toOrm(null as any)).toBeNull();
    expect(ItemWalletOrmMapper.toDomain(null as any)).toBeNull();
  });

  it('wallet mapping round-trip', () => {
    const d = ItemWalletEntity.of({ balanceItems: 7 }, 'u1');
    const orm = ItemWalletOrmMapper.toOrm(d);
    const back = ItemWalletOrmMapper.toDomain(orm);
    expect(back.id).toBe('u1');
    expect(back.balanceItems).toBe(7);
  });

  it('lot mapping round-trip', () => {
    const d = ItemLotEntity.of(
      {
        grantedItems: 10,
        remainingItems: 4,
        status: ItemLotStatus.OPEN,
      },
      { userId: 'u1', paymentId: 'p1' },
    );
    const orm = ItemLotOrmMapper.toOrm(d);
    const back = ItemLotOrmMapper.toDomain(orm);
    expect(back.userId).toBe('u1');
    expect(back.paymentId).toBe('p1');
    expect(back.remainingItems).toBe(4);
    expect(back.status).toBe(ItemLotStatus.OPEN);
  });

  it('ledger mapping round-trip', () => {
    const occurredAt = new Date('2026-01-01T00:00:00.000Z');
    const d = ItemLedgerEntity.of(
      {
        type: ItemLedgerType.GRANT,
        amountItems: 10,
        referenceType: ItemReferenceType.PAYMENT,
        referenceId: 'pay-1',
        idempotencyKey: 'k-1',
        occurredAt,
      },
      'u1',
    );
    const orm = ItemLedgerOrmMapper.toOrm(d);
    const back = ItemLedgerOrmMapper.toDomain(orm);
    expect(back.id).toBe('u1');
    expect(back.type).toBe(ItemLedgerType.GRANT);
    expect(back.referenceId).toBe('pay-1');
    expect(back.occurredAt.toISOString()).toBe(occurredAt.toISOString());
  });
});


