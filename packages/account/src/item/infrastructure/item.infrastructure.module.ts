import { Module, Provider } from '@nestjs/common';
import { ItemLedgerRepositoryPort } from '@app/item/domain/port/item-ledger.repository.port';
import { ItemLotRepositoryPort } from '@app/item/domain/port/item-lot.repository.port';
import { ItemWalletRepositoryPort } from '@app/item/domain/port/item-wallet.repository.port';
import { ItemLedgerOrmRepository } from './adapter/outbound/persistence/item-ledger-orm.repository';
import { ItemLotOrmRepository } from './adapter/outbound/persistence/item-lot-orm.repository';
import { ItemWalletOrmRepository } from './adapter/outbound/persistence/item-wallet-orm.repository';

const providers: Provider[] = [
  { provide: ItemLedgerRepositoryPort, useClass: ItemLedgerOrmRepository },
  { provide: ItemWalletRepositoryPort, useClass: ItemWalletOrmRepository },
  { provide: ItemLotRepositoryPort, useClass: ItemLotOrmRepository },
];

@Module({
  providers,
  exports: providers,
})
export class ItemInfrastructureModule {}


