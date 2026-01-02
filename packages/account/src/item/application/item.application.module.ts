import { Module, Provider } from '@nestjs/common';
import { ApplyItemDeltaHandler } from './service/command/apply-item-delta.command';
import { ItemInfrastructureModule } from '../infrastructure/item.infrastructure.module';

const providers: Provider[] = [ApplyItemDeltaHandler];

@Module({
  imports: [ItemInfrastructureModule],
  providers,
  exports: providers,
})
export class ItemApplicationModule {}


