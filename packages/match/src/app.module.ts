import { JwtAuthModule } from "@core/auth";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule, DatabaseSchema } from '@core/database';
import { validationSchema } from './config/env.config';
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloFederationDriver, ApolloFederationDriverConfig } from "@nestjs/apollo";
import { LikeApplicationModule } from "./like/application/like.application.module";
import { PairApplicationModule } from "./pair/applicatoin/pair.application.module";
import { FeedApplicationModule } from "./feed/application/feed.application.module";
import { LocationApplicationModule } from "./location/application/location.application.module";
import { HttpModule } from "@core/http";
import { HttpLoggerModule } from "@core/logger";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { AppController } from "./app.controller";

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
        JwtAuthModule.forRootAsync({
            imports : [ConfigModule],
            inject : [ConfigService],
            useFactory : (configService : ConfigService) => {
                // JWT 관련 환경변수 가져오기
                const secret = configService.get<string>('JWT_SECRET', 'secret_key_for_development');
                const accessExpiresIn = configService.get<number>('JWT_ACCESS_EXPIRATION', 3600); // 기본값 1시간
                const refreshExpiresIn = configService.get<number>('JWT_REFRESH_EXPIRATION', 604800); // 기본값 7일
                const userServiceHost = configService.get<string>('USER_SERVICE_HOST', 'http://localhost:3000');
                return {
                secret,
                accessExpiresIn,
                refreshExpiresIn,
                userServiceHost
                };
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