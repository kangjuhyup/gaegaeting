import { ApplyItemDeltaHandler } from '@app/item/application/service/command/apply-item-delta.command';
import { ApplyItemDeltaCommand } from '@app/item/application/port/command/apply-item-delta.port';
import { ItemLedgerType, ItemReferenceType } from '@app/item/domain/enum/item-ledger';
import { DataSource } from 'typeorm';
import { ItemLedgerRepositoryPort } from '@app/item/domain/port/item-ledger.repository.port';
import { ItemWalletRepositoryPort } from '@app/item/domain/port/item-wallet.repository.port';
import { ItemLotRepositoryPort } from '@app/item/domain/port/item-lot.repository.port';
import { ItemWalletEntity } from '@app/item/domain/model/item-wallet';
import { ItemLotEntity } from '@app/item/domain/model/item-lot';
import { ItemLotStatus } from '@app/item/domain/enum/item-lot-status';

describe('ApplyItemDeltaHandler (UNIT)', () => {
  let handler: ApplyItemDeltaHandler;
  let ledgerRepo: jest.Mocked<ItemLedgerRepositoryPort>;
  let walletRepo: jest.Mocked<ItemWalletRepositoryPort>;
  let lotRepo: jest.Mocked<ItemLotRepositoryPort>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(() => {
    ledgerRepo = { insertIdempotent: jest.fn() } as any;
    walletRepo = { getOrCreateAndLock: jest.fn(), save: jest.fn() } as any;
    lotRepo = {
      insertIfNotExists: jest.fn(),
      findOpenLotsForUpdate: jest.fn(),
      findLotForUpdate: jest.fn(),
      save: jest.fn(),
    } as any;

    dataSource = {
      transaction: jest.fn(async (cb: any) => cb({} as any)),
    } as any;

    handler = new ApplyItemDeltaHandler(ledgerRepo, walletRepo, lotRepo, dataSource);
  });

  it('idempotency: insert false면 나머지 로직 실행 안함', async () => {
    ledgerRepo.insertIdempotent.mockResolvedValue(false);
    const cmd = new ApplyItemDeltaCommand({
      userId: 'u1',
      amountItems: 10,
      ledgerType: ItemLedgerType.GRANT,
      referenceType: ItemReferenceType.PAYMENT,
      referenceId: 'pay-1',
      idempotencyKey: 'idem-1',
      occurredAt: '2026-01-01T00:00:00.000Z',
    });

    await handler.execute(cmd);

    expect(walletRepo.getOrCreateAndLock).not.toHaveBeenCalled();
    expect(lotRepo.insertIfNotExists).not.toHaveBeenCalled();
  });

  it('GRANT(+): wallet 증가 + lot 생성', async () => {
    ledgerRepo.insertIdempotent.mockResolvedValue(true);
    walletRepo.getOrCreateAndLock.mockResolvedValue(ItemWalletEntity.of({ balanceItems: 0 }, 'u1'));

    const cmd = new ApplyItemDeltaCommand({
      userId: 'u1',
      amountItems: 10,
      ledgerType: ItemLedgerType.GRANT,
      referenceType: ItemReferenceType.PAYMENT,
      referenceId: 'pay-1',
      idempotencyKey: 'idem-1',
      occurredAt: '2026-01-01T00:00:00.000Z',
    });

    await handler.execute(cmd);

    expect(walletRepo.save).toHaveBeenCalledTimes(1);
    const savedWallet = walletRepo.save.mock.calls[0][0];
    expect(savedWallet.id).toBe('u1');
    expect(savedWallet.balanceItems).toBe(10);

    expect(lotRepo.insertIfNotExists).toHaveBeenCalledTimes(1);
    const savedLot = lotRepo.insertIfNotExists.mock.calls[0][0];
    expect(savedLot.userId).toBe('u1');
    expect(savedLot.paymentId).toBe('pay-1');
    expect(savedLot.remainingItems).toBe(10);
    expect(savedLot.status).toBe(ItemLotStatus.OPEN);
  });

  it('SPEND(-): lot에서 차감하고 부족하면 에러', async () => {
    ledgerRepo.insertIdempotent.mockResolvedValue(true);
    walletRepo.getOrCreateAndLock.mockResolvedValue(ItemWalletEntity.of({ balanceItems: 10 }, 'u1'));

    const lot1 = ItemLotEntity.of(
      { grantedItems: 10, remainingItems: 1, status: ItemLotStatus.OPEN },
      { userId: 'u1', paymentId: 'p1' },
    );
    const lot2 = ItemLotEntity.of(
      { grantedItems: 10, remainingItems: 1, status: ItemLotStatus.OPEN },
      { userId: 'u1', paymentId: 'p2' },
    );
    lotRepo.findOpenLotsForUpdate.mockResolvedValue([lot1, lot2]);

    const cmd = new ApplyItemDeltaCommand({
      userId: 'u1',
      amountItems: -5,
      ledgerType: ItemLedgerType.SPEND,
      referenceType: ItemReferenceType.FEATURE_USE,
      referenceId: 'use-1',
      idempotencyKey: 'idem-1',
    });

    await expect(handler.execute(cmd)).rejects.toThrow('lot insufficient');
  });

  it('REVOKE(-): lot revoke 후 저장', async () => {
    ledgerRepo.insertIdempotent.mockResolvedValue(true);
    walletRepo.getOrCreateAndLock.mockResolvedValue(ItemWalletEntity.of({ balanceItems: 10 }, 'u1'));

    const lot = ItemLotEntity.of(
      { grantedItems: 10, remainingItems: 10, status: ItemLotStatus.OPEN },
      { userId: 'u1', paymentId: 'pay-1' },
    );
    lotRepo.findLotForUpdate.mockResolvedValue(lot);

    const cmd = new ApplyItemDeltaCommand({
      userId: 'u1',
      amountItems: -4,
      ledgerType: ItemLedgerType.REVOKE,
      referenceType: ItemReferenceType.REFUND,
      referenceId: 'refund-1',
      originalReferenceId: 'pay-1',
      idempotencyKey: 'idem-1',
    });

    await handler.execute(cmd);

    expect(lotRepo.save).toHaveBeenCalledTimes(1);
    expect(lot.status).toBe(ItemLotStatus.REVOKED);
    expect(lot.remainingItems).toBe(6);
  });

  it('userId 없으면 에러', async () => {
    const cmd = new ApplyItemDeltaCommand({
      userId: '' as any,
      amountItems: 10,
      ledgerType: ItemLedgerType.GRANT,
      referenceType: ItemReferenceType.PAYMENT,
      referenceId: 'pay-1',
      idempotencyKey: 'idem-1',
    });

    await expect(handler.execute(cmd)).rejects.toThrow('userId is required');
  });

  it('amountItems가 유한수 아니면 에러', async () => {
    const cmd = new ApplyItemDeltaCommand({
      userId: 'u1',
      amountItems: NaN,
      ledgerType: ItemLedgerType.GRANT,
      referenceType: ItemReferenceType.PAYMENT,
      referenceId: 'pay-1',
      idempotencyKey: 'idem-1',
    });

    await expect(handler.execute(cmd)).rejects.toThrow('amountItems must be a finite number');
  });
});


