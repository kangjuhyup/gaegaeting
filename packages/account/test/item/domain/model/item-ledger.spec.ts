import { ItemLedgerEntity } from '@app/item/domain/model/item-ledger';
import { ItemLedgerType, ItemReferenceType } from '@app/item/domain/enum/item-ledger';

describe('ItemLedger (UNIT)', () => {
  it('of: 필드를 그대로 가진다', () => {
    const occurredAt = new Date('2026-01-01T00:00:00.000Z');
    const l = ItemLedgerEntity.of(
      {
        type: ItemLedgerType.GRANT,
        amountItems: 10,
        referenceType: ItemReferenceType.PAYMENT,
        referenceId: 'pay-1',
        idempotencyKey: 'k-1',
        occurredAt,
        originalReferenceId: 'orig-1',
      },
      'u1',
    );

    expect(l.id).toBe('u1');
    expect(l.type).toBe(ItemLedgerType.GRANT);
    expect(l.amountItems).toBe(10);
    expect(l.referenceType).toBe(ItemReferenceType.PAYMENT);
    expect(l.referenceId).toBe('pay-1');
    expect(l.idempotencyKey).toBe('k-1');
    expect(l.occurredAt).toBe(occurredAt);
    expect(l.originalReferenceId).toBe('orig-1');
  });
});


