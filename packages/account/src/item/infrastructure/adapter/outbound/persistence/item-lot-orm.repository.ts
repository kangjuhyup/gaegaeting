import { BaseRepository, ItemLotOrmEntity, ItemLotStatus } from '@core/database';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ItemLotRepositoryPort } from '@app/item/domain/port/item-lot.repository.port';
import { ItemLotEntity } from '@app/item/domain/model/item-lot';
import { ItemLotOrmMapper } from './mapper/item-lot-orm.mapper';

@Injectable()
export class ItemLotOrmRepository
  extends BaseRepository<ItemLotOrmEntity>
  implements ItemLotRepositoryPort
{
  constructor(dataSource: DataSource) {
    super(ItemLotOrmEntity, dataSource);
  }

  async insertIfNotExists(lot: ItemLotEntity): Promise<void> {
    try {
      await this.getRepository().insert(ItemLotOrmMapper.toOrm(lot));
    } catch (e: any) {
      if (String(e?.code) === 'ER_DUP_ENTRY') return;
      throw e;
    }
  }

  async findOpenLotsForUpdate(userId: string): Promise<ItemLotEntity[]> {
    const rows = await this.getRepository().find({
      where: { userId, status: ItemLotStatus.OPEN },
      order: { createdAt: 'ASC' as any },
      lock: { mode: 'pessimistic_write' as any },
    });
    return rows.map((r) => ItemLotOrmMapper.toDomain(r));
  }

  async findLotForUpdate(userId: string, paymentId: string): Promise<ItemLotEntity | null> {
    const row = await this.getRepository().findOne({
      where: { userId, paymentId },
      lock: { mode: 'pessimistic_write' as any },
    });
    return row ? ItemLotOrmMapper.toDomain(row) : null;
  }

  async save(lot: ItemLotEntity): Promise<void> {
    await this.getRepository().save(ItemLotOrmMapper.toOrm(lot));
  }
}


