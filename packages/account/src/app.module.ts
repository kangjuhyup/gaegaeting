import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validationSchema } from './config/env.config';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from './auth/auth.module';
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
    AuthModule,
    PetModule
  ],
  controllers : [
    AppController
  ]
})
export class AppModule {}
