import { JwtAuthModule } from "@core/auth";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule, DatabaseSchema } from '@core/database';
import { validationSchema } from './config/env.config';
import { LikeApplicationModule } from "./like/application/like.application.module";
import { PairApplicationModule } from "./pair/applicatoin/pair.application.module";
import { FeedApplicationModule } from "./feed/application/feed.application.module";
import { LocationApplicationModule } from "./location/application/location.application.module";

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
        CqrsModule.forRoot(),
            // DATABASE
        DatabaseModule.forRootAsync({
            imports : [
                ConfigModule
            ],
            inject : [ConfigService]
        },
            [DatabaseSchema.MATCH],
        ),// 인증 모듈
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
        LocationApplicationModule,
        FeedApplicationModule,
        LikeApplicationModule,
        PairApplicationModule,
    ]
})
export class AppModule {}