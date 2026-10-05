import { Module } from "@nestjs/common";
import type { Pool } from "pg";
import { ApiAuthModule } from "../common/api-auth.module.js";
import { RuntimeModule, PAYMENT_POOL } from "../common/runtime.module.js";
import { WalletStore } from "./application/wallet-store.js";
import { WalletService } from "./application/wallet.service.js";
import { WalletResolver } from "./delivery/wallet.resolver.js";
import { PostgresWalletStore } from "./infrastructure/postgres-wallet.store.js";

@Module({
  imports: [RuntimeModule, ApiAuthModule],
  providers: [
    {
      provide: WalletStore,
      inject: [PAYMENT_POOL],
      useFactory: (pool: Pool) => new PostgresWalletStore(pool),
    },
    {
      provide: WalletService,
      inject: [WalletStore],
      useFactory: (store: WalletStore) => new WalletService(store),
    },
    WalletResolver,
  ],
  exports: [WalletService],
})
export class WalletModule {}
