import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Pool } from "pg";
import {
  readPaymentConfiguration,
  type PaymentConfiguration,
} from "../config.js";

export const PAYMENT_CONFIG = Symbol("PAYMENT_CONFIG");
export const PAYMENT_POOL = Symbol("PAYMENT_POOL");

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: "packages/payment/.env",
    }),
  ],
  providers: [
    {
      provide: PAYMENT_CONFIG,
      useFactory: () => readPaymentConfiguration(process.env),
    },
    {
      provide: PAYMENT_POOL,
      inject: [PAYMENT_CONFIG],
      useFactory: (config: PaymentConfiguration) =>
        new Pool({
          ...config.database,
          max: 10,
          connectionTimeoutMillis: 5000,
          idleTimeoutMillis: 30_000,
        }),
    },
  ],
  exports: [PAYMENT_CONFIG, PAYMENT_POOL],
})
export class RuntimeModule {}
