import { Module } from "@nestjs/common";
import type { Pool } from "pg";
import { ApiAuthModule } from "../common/api-auth.module.js";
import {
  RuntimeModule,
  PAYMENT_CONFIG,
  PAYMENT_POOL,
} from "../common/runtime.module.js";
import type { PaymentConfiguration } from "../config.js";
import { ItemModule } from "../item/item.module.js";
import { ItemService } from "../item/application/item.service.js";
import { WalletModule } from "../wallet/wallet.module.js";
import { PaymentStore } from "./application/payment-store.js";
import { PaymentService } from "./application/payment.service.js";
import { PostgresPaymentStore } from "./infrastructure/persistence/postgres-payment.store.js";
import { AppleStoreAdapter } from "./infrastructure/stores/apple-store.js";
import { GoogleStoreAdapter } from "./infrastructure/stores/google-store.js";
import { ProofVault } from "./infrastructure/proof-vault.js";
import { PaymentResolver } from "./delivery/payment.resolver.js";
import { NotificationController } from "./delivery/notification.controller.js";
import { PaymentWorker } from "./payment.worker.js";

@Module({
  imports: [RuntimeModule, ApiAuthModule, ItemModule, WalletModule],
  providers: [
    {
      provide: PaymentStore,
      inject: [PAYMENT_POOL, PAYMENT_CONFIG],
      useFactory: (pool: Pool, config: PaymentConfiguration) =>
        new PostgresPaymentStore(pool, config.environment, 300),
    },
    {
      provide: PaymentService,
      inject: [PaymentStore, PAYMENT_CONFIG, ItemService],
      useFactory: (
        store: PaymentStore,
        config: PaymentConfiguration,
        items: ItemService,
      ) =>
        new PaymentService(
          store,
          [
            ...(config.apple ? [new AppleStoreAdapter(config.apple)] : []),
            ...(config.google ? [new GoogleStoreAdapter(config.google)] : []),
          ],
          new ProofVault(config.encryptionKey),
          config.environment,
          items,
        ),
    },
    {
      provide: PaymentWorker,
      inject: [PaymentService, PaymentStore, PAYMENT_CONFIG],
      useFactory: (
        service: PaymentService,
        store: PaymentStore,
        config: PaymentConfiguration,
      ) => new PaymentWorker(service, store, config.worker),
    },
    PaymentResolver,
  ],
  controllers: [NotificationController],
})
export class PaymentModule {}
