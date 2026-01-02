import { BaseRepository, ItemWalletOrmEntity } from '@core/database';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ItemWalletRepositoryPort } from '@app/item/domain/port/item-wallet.repository.port';
import { ItemWalletEntity } from '@app/item/domain/model/item-wallet';
import { ItemWalletOrmMapper } from './mapper/item-wallet-orm.mapper';

@Injectable()
export class ItemWalletOrmRepository
  extends BaseRepository<ItemWalletOrmEntity>
  implements ItemWalletRepositoryPort
{
  constructor(dataSource: DataSource) {
    super(ItemWalletOrmEntity, dataSource);
  }

  async getOrCreateAndLock(userId: string): Promise<ItemWalletEntity> {
    const repo = this.getRepository();

    let wallet = await repo.findOne({
      where: { userId },
      lock: { mode: 'pessimistic_write' as any },
    });

    if (!wallet) {
      await repo.insert(repo.create({ userId, balanceItems: 0 }));
      wallet = await repo.findOneOrFail({
        where: { userId },
        lock: { mode: 'pessimistic_write' as any },
      });
    }

    return ItemWalletOrmMapper.toDomain(wallet);
  }

  async save(wallet: ItemWalletEntity): Promise<void> {
    await this.getRepository().save(ItemWalletOrmMapper.toOrm(wallet));
  }
}


