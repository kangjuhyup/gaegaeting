import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ENV_KEY, validationSchema } from './config/env.config';
import { CqrsModule } from '@nestjs/cqrs';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { UserModule } from './user/user.module';
import { JwtAuthModule } from '@core/auth';
import { DatabaseModule, DatabaseSchema } from '@core/database';
import { HttpModule } from '@core/http';
import { HttpLoggerModule } from '@core/logger';
import { PetModule } from './pet/pet.module';
import { AppController } from './app.controller';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    // 환경변수
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
      name: 'Account-API',
      level: process.env.LOG_LEVEL || 'info',
    }),
    // DATABASE
    DatabaseModule.forRootAsync(
      {
          imports : [
              ConfigModule
          ],
          inject : [ConfigService]
      },
      [DatabaseSchema.USER],
  ),
    // CQRS
    CqrsModule.forRoot({}),
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: { federation: 2 },
      sortSchema: true,
      // 전역 prefix(account)를 포함한 절대 경로로 명시적으로 설정
      path: '/account/graphql',
      playground: true,
      introspection: true,
    }),
    // Http
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
        const secret = configService.get<string>(ENV_KEY.JWT_SECRET, 'secret_key_for_development');
        const accessExpiresIn = configService.get<number>(ENV_KEY.JWT_ACCESS_EXPIRATION);
        const refreshExpiresIn = configService.get<number>(ENV_KEY.JWT_REFRESH_EXPIRATION,);
        return {
          secret,
          accessExpiresIn,
          refreshExpiresIn,
        };
      },
    }),
    EventEmitterModule.forRoot(),
    // 도메인 모듈
    UserModule,
    PetModule
  ],
  controllers : [
    AppController
  ]
})
export class AppModule {}
