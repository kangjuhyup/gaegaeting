import { Module } from "@nestjs/common";
import type { Pool } from "pg";
import { ApiAuthModule } from "../common/api-auth.module.js";
import {
  RuntimeModule,
  PAYMENT_CONFIG,
  PAYMENT_POOL,
} from "../common/runtime.module.js";
import type { PaymentConfiguration } from "../config.js";
import type { Provider } from "../common/domain/store.js";
import { ItemStore } from "./application/item-store.js";
import { ItemService } from "./application/item.service.js";
import { ItemResolver } from "./delivery/item.resolver.js";
import { PostgresItemStore } from "./infrastructure/postgres-item.store.js";

@Module({
  imports: [RuntimeModule, ApiAuthModule],
  providers: [
    {
      provide: ItemStore,
      inject: [PAYMENT_POOL],
      useFactory: (pool: Pool) => new PostgresItemStore(pool),
    },
    {
      provide: ItemService,
      inject: [ItemStore, PAYMENT_CONFIG],
      useFactory: (store: ItemStore, config: PaymentConfiguration) =>
        new ItemService(store, [
          ...(config.apple ? ["APPLE" as Provider] : []),
          ...(config.google ? ["GOOGLE" as Provider] : []),
        ]),
    },
    ItemResolver,
  ],
  exports: [ItemService],
})
export class ItemModule {}
