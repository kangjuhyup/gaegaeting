import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { InternalAuthModule } from "@core/auth";

@Module({
  imports: [
    InternalAuthModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>("INTERNAL_AUTH_ASSERTION_SECRET");
        if (!secret || secret.length < 32)
          throw new Error("INTERNAL_AUTH_ASSERTION_SECRET is required");
        return { secret, issuer: "gaegaeting-gateway", audience: "payment" };
      },
    }),
  ],
  exports: [InternalAuthModule],
})
export class ApiAuthModule {}
