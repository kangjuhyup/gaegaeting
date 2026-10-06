import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import {
  ApolloFederationDriver,
  type ApolloFederationDriverConfig,
} from "@nestjs/apollo";
import { RuntimeModule } from "./common/runtime.module.js";
import { ItemModule } from "./item/item.module.js";
import { WalletModule } from "./wallet/wallet.module.js";
import { PaymentModule } from "./payment/payment.module.js";
import { AppController } from "./app.controller.js";

@Module({
  imports: [
    RuntimeModule,
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: { federation: 2 },
      sortSchema: true,
      path: "/payment/graphql",
    }),
    ItemModule,
    WalletModule,
    PaymentModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
