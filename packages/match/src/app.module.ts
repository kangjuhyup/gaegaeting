import { InternalAuthModule } from "@core/auth";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule, DatabaseSchema } from '@core/database';
import { validationSchema } from './config/env.config.js';
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloFederationDriver, type ApolloFederationDriverConfig } from "@nestjs/apollo";
import { LikeApplicationModule } from "./like/application/like.application.module.js";
import { PairApplicationModule } from "./pair/applicatoin/pair.application.module.js";
import { FeedApplicationModule } from "./feed/application/feed.application.module.js";
import { LocationApplicationModule } from "./location/application/location.application.module.js";
import { HttpModule } from "@core/http";
import { HttpLoggerModule } from "@core/logger";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { AppController } from "./app.controller.js";

@Module({
    imports : [
        ConfigModule.forRoot({
            isGlobal: true,
            validationSchema: validationSchema,
            validationOptions: {
              allowUnknown: true,
              abortEarly: false,
            },
          }),
        // HTTP 로깅
        HttpLoggerModule.forRoot({
            name: 'Match-API',
            level: process.env.LOG_LEVEL || 'info',
        }),
        CqrsModule.forRoot(),
            // DATABASE
        DatabaseModule.forRootAsync({
            imports : [
                ConfigModule
            ],
            inject : [ConfigService]
        },
            [DatabaseSchema.MATCH],
        ),
        HttpModule.forRoot({
            timeout : 5000,
            retryCount : 3,
          }),
        // 인증 모듈
        InternalAuthModule.forRootAsync({
            imports : [ConfigModule],
            inject : [ConfigService],
            useFactory : (configService : ConfigService) => {
                const secret = configService.get<string>('INTERNAL_AUTH_ASSERTION_SECRET');
                if (!secret) throw new Error('INTERNAL_AUTH_ASSERTION_SECRET is required');
                return { secret, issuer: 'gaegaeting-gateway', audience: 'match' };
            },
        }),
        // GraphQL (code-first)
        GraphQLModule.forRoot<ApolloFederationDriverConfig>({
            driver: ApolloFederationDriver,
            // keep in-memory to avoid filesystem path issues
            autoSchemaFile: { federation : 2 },
            sortSchema: true,
            path: '/match/graphql',
            playground: true,
            introspection: true,
        }),
        EventEmitterModule.forRoot(),
        
        LocationApplicationModule,
        FeedApplicationModule,
        LikeApplicationModule,
        PairApplicationModule,
    ],
    controllers : [
        AppController
    ]
})
export class AppModule {}
