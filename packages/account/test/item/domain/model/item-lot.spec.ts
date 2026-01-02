import { ItemLotEntity } from '@app/item/domain/model/item-lot';
import { ItemLotStatus } from '@app/item/domain/enum/item-lot-status';

describe('ItemLot (UNIT)', () => {
  it('spend: remainingItems에서 차감되고, 0이면 DEPLETED로 전환', () => {
    const lot = ItemLotEntity.of(
      {
        grantedItems: 10,
        remainingItems: 3,
        status: ItemLotStatus.OPEN,
      },
      { userId: 'u1', paymentId: 'p1' },
    );

    const spent = lot.spend(5);
    expect(spent).toBe(3);
    expect(lot.remainingItems).toBe(0);
    expect(lot.status).toBe(ItemLotStatus.DEPLETED);
  });

  it('spend: remainingItems가 남으면 OPEN 유지', () => {
    const lot = ItemLotEntity.of(
      {
        grantedItems: 10,
        remainingItems: 10,
        status: ItemLotStatus.OPEN,
      },
      { userId: 'u1', paymentId: 'p1' },
    );

    const spent = lot.spend(3);
    expect(spent).toBe(3);
    expect(lot.remainingItems).toBe(7);
    expect(lot.status).toBe(ItemLotStatus.OPEN);
  });

  it('revoke: 상태는 REVOKED로 전환되고 remainingItems가 줄어든다', () => {
    const lot = ItemLotEntity.of(
      {
        grantedItems: 10,
        remainingItems: 10,
        status: ItemLotStatus.OPEN,
      },
      { userId: 'u1', paymentId: 'p1' },
    );

    const revoked = lot.revoke(4);
    expect(revoked).toBe(4);
    expect(lot.remainingItems).toBe(6);
    expect(lot.status).toBe(ItemLotStatus.REVOKED);
  });

  it('revoke: remainingItems가 이미 0이면 revoked=0이고 REVOKED', () => {
    const lot = ItemLotEntity.of(
      {
        grantedItems: 10,
        remainingItems: 0,
        status: ItemLotStatus.DEPLETED,
      },
      { userId: 'u1', paymentId: 'p1' },
    );

    const revoked = lot.revoke(4);
    expect(revoked).toBe(0);
    expect(lot.remainingItems).toBe(0);
    expect(lot.status).toBe(ItemLotStatus.REVOKED);
  });
});


