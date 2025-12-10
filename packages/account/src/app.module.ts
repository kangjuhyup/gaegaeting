import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validationSchema } from './config/env.config';
import { CqrsModule } from '@nestjs/cqrs';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { UserModule, USER_GRAPHQL_SCHEMA_PATH, USER_GRAPHQL_DEFINITIONS_PATH } from './user/user.module';
import { JwtAuthModule } from '@core/auth';
import { DatabaseModule, DatabaseSchema } from '@core/database';
import { HttpModule } from '@core/http';
import { HttpLoggerModule } from '@core/logger';
import { PetModule, PET_GRAPHQL_SCHEMA_PATH, PET_GRAPHQL_DEFINITIONS_PATH } from './pet/pet.module';
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
    // GraphQL - 각 모듈에서 정의한 스키마 경로 수집
    // 각 모듈의 스키마와 같은 경로에 graphql.ts를 생성하기 위해
    // 각 모듈의 스키마 경로를 순회하며 타입 정의를 생성
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      typePaths: [
        USER_GRAPHQL_SCHEMA_PATH,
        PET_GRAPHQL_SCHEMA_PATH,
      ],
      // 각 모듈의 스키마와 같은 경로에 graphql.ts를 생성
      // 주의: definitions.path는 하나만 지정 가능하므로, 
      // 각 모듈별로 별도의 GraphQLModule을 설정하거나 스크립트로 생성해야 함
      // 여기서는 user 모듈의 경로를 사용 (기본값)
      definitions: {
        path: USER_GRAPHQL_DEFINITIONS_PATH,
      },
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
