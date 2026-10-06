import { InternalAuthModule } from "@core/auth";
import { DatabaseModule } from "@core/database";
import { HttpLoggerModule } from "@core/logger";
import {
  ApolloFederationDriver,
  type ApolloFederationDriverConfig,
} from "@nestjs/apollo";
import { Controller, Get, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import Joi from "joi";
import { ChallengeModule } from "./challenge.module.js";
import { CHALLENGE_ENTITIES } from "./shared/infrastructure/persistence/challenge.entities.js";
import { WALKING_ENTITIES } from "./shared/walking-entities.js";

@Controller("health")
class HealthController {
  @Get() health() {
    return { ok: true };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        CHALLENGE_SERVICE_API_PORT: Joi.number()
          .integer()
          .min(0)
          .max(65535)
          .default(2803),
        INTERNAL_AUTH_ASSERTION_SECRET: Joi.string().min(32).required(),
        CHALLENGE_ACTIVITY_SECRET: Joi.string().min(32).max(512).required(),
        DATABASE_HOST: Joi.string().required(),
        DATABASE_PORT: Joi.number().port().required(),
        DATABASE_USERNAME: Joi.string().required(),
        DATABASE_PASSWORD: Joi.string().required(),
        DATABASE_NAME: Joi.string().default("ggt_challenge"),
      }),
    }),
    HttpLoggerModule.forRoot({
      name: "Challenge-API",
      level: process.env.NODE_ENV === "test" ? "silent" : "info",
    }),
    DatabaseModule.forEntitiesAsync(
      { imports: [ConfigModule], inject: [ConfigService] },
      [...CHALLENGE_ENTITIES, ...WALKING_ENTITIES],
    ),
    InternalAuthModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("INTERNAL_AUTH_ASSERTION_SECRET"),
        issuer: "gaegaeting-gateway",
        audience: "challenge",
      }),
    }),
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: { federation: 2 },
      sortSchema: true,
      path: "/challenge/graphql",
      playground: false,
    }),
    ChallengeModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
