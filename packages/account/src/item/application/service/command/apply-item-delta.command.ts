import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';
import { Transactional } from '@core/database';
import { ApplyItemDeltaCommand } from '../../port/command/apply-item-delta.port';
import { ItemLedgerEntity } from '@app/item/domain/model/item-ledger';
import { ItemLotEntity } from '@app/item/domain/model/item-lot';
import { ItemLedgerRepositoryPort } from '@app/item/domain/port/item-ledger.repository.port';
import { ItemLotRepositoryPort } from '@app/item/domain/port/item-lot.repository.port';
import { ItemWalletRepositoryPort } from '@app/item/domain/port/item-wallet.repository.port';
import { ItemLedgerType } from '@app/item/domain/enum/item-ledger';
import { ItemLotStatus } from '@app/item/domain/enum/item-lot-status';

@CommandHandler(ApplyItemDeltaCommand)
export class ApplyItemDeltaHandler implements ICommandHandler<ApplyItemDeltaCommand> {
  constructor(
    private readonly itemLedgerRepository: ItemLedgerRepositoryPort,
    private readonly itemWalletRepository: ItemWalletRepositoryPort,
    private readonly itemLotRepository: ItemLotRepositoryPort,
    private readonly dataSource: DataSource,
  ) {}

  @Transactional()
  async execute(command: ApplyItemDeltaCommand): Promise<void> {
    const evt = command.payload;

    if (!evt?.userId) throw new Error('userId is required');
    if (!evt?.idempotencyKey) throw new Error('idempotencyKey is required');
    if (!evt?.referenceId) throw new Error('referenceId is required');
    if (typeof evt.amountItems !== 'number' || !Number.isFinite(evt.amountItems)) {
      throw new Error('amountItems must be a finite number');
    }

    const occurredAt = evt.occurredAt ? new Date(evt.occurredAt) : new Date();

    // 1) idempotency gate: try insert ledger first
    const ledger = ItemLedgerEntity.of(
      {
        type: evt.ledgerType,
        amountItems: evt.amountItems,
        referenceType: evt.referenceType,
        referenceId: evt.referenceId,
        originalReferenceId: evt.originalReferenceId,
        idempotencyKey: evt.idempotencyKey,
        occurredAt,
      },
      evt.userId,
    );

    const inserted = await this.itemLedgerRepository.insertIdempotent(ledger);
    if (!inserted) return; // already processed

    // 2) lock wallet row
    const wallet = await this.itemWalletRepository.getOrCreateAndLock(evt.userId);
    wallet.applyDelta(evt.amountItems);
    await this.itemWalletRepository.save(wallet);

    // 3) lot bookkeeping
    if (evt.ledgerType === ItemLedgerType.GRANT && evt.amountItems > 0) {
      // referenceId = paymentId
      const lot = ItemLotEntity.of(
        {
          grantedItems: evt.amountItems,
          remainingItems: evt.amountItems,
          status: ItemLotStatus.OPEN,
        },
        { userId: evt.userId, paymentId: evt.referenceId },
      );
      await this.itemLotRepository.insertIfNotExists(lot);
      return;
    }

    if (evt.ledgerType === ItemLedgerType.SPEND && evt.amountItems < 0) {
      let toSpend = -evt.amountItems;
      const lots = await this.itemLotRepository.findOpenLotsForUpdate(evt.userId);

      for (const lot of lots) {
        if (toSpend <= 0) break;
        const prevStatus = lot.status;
        const spent = lot.spend(toSpend);
        toSpend -= spent;
        if (spent > 0 || prevStatus !== lot.status) {
          await this.itemLotRepository.save(lot);
        }
      }

      if (toSpend > 0) {
        throw new Error(`lot insufficient: remainingSpend=${toSpend}`);
      }
      return;
    }

    if (evt.ledgerType === ItemLedgerType.REVOKE && evt.amountItems < 0) {
      const targetPaymentId = evt.originalReferenceId ?? evt.referenceId;
      const lot = await this.itemLotRepository.findLotForUpdate(evt.userId, targetPaymentId);
      if (!lot) return;
      lot.revoke(-evt.amountItems);
      await this.itemLotRepository.save(lot);
    }
  }
}


