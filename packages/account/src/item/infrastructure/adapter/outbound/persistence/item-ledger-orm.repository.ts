import { BaseRepository, ItemLedgerOrmEntity } from '@core/database';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ItemLedgerRepositoryPort } from '@app/item/domain/port/item-ledger.repository.port';
import { ItemLedgerEntity } from '@app/item/domain/model/item-ledger';
import { ItemLedgerOrmMapper } from './mapper/item-ledger-orm.mapper';

@Injectable()
export class ItemLedgerOrmRepository
  extends BaseRepository<ItemLedgerOrmEntity>
  implements ItemLedgerRepositoryPort
{
  constructor(dataSource: DataSource) {
    super(ItemLedgerOrmEntity, dataSource);
  }

  async insertIdempotent(ledger: ItemLedgerEntity): Promise<boolean> {
    const orm = ItemLedgerOrmMapper.toOrm(ledger);
    try {
      await this.getRepository().insert(orm);
      return true;
    } catch (e: any) {
      if (String(e?.code) === 'ER_DUP_ENTRY') return false;
      throw e;
    }
  }
}


