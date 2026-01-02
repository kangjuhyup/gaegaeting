import { ItemWalletEntity } from '@app/item/domain/model/item-wallet';

describe('ItemWallet (UNIT)', () => {
  it('applyDelta: 잔액이 증가한다', () => {
    const w = ItemWalletEntity.of({ balanceItems: 10 }, 'u1');
    w.applyDelta(5);
    expect(w.balanceItems).toBe(15);
  });

  it('applyDelta: 잔액이 감소한다', () => {
    const w = ItemWalletEntity.of({ balanceItems: 10 }, 'u1');
    w.applyDelta(-3);
    expect(w.balanceItems).toBe(7);
  });

  it('applyDelta: 잔액이 음수가 되면 에러', () => {
    const w = ItemWalletEntity.of({ balanceItems: 1 }, 'u1');
    expect(() => w.applyDelta(-2)).toThrow('insufficient items');
  });
});


