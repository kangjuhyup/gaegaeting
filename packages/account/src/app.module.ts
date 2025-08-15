import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validationSchema } from './auth/config/env.config';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { JwtAuthModule } from '@core/auth';

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
    // CQRS
    CqrsModule.forRoot(),
    // 인증 모듈
    JwtAuthModule.forRootAsync({
      imports : [ConfigModule],
      inject : [ConfigService],
      useFactory : (configService : ConfigService) => {
        // JWT 관련 환경변수 가져오기
        const secret = configService.get<string>('JWT_SECRET', 'secret_key_for_development');
        const accessExpiresIn = configService.get<number>('JWT_ACCESS_EXPIRATION', 3600); // 기본값 1시간
        const refreshExpiresIn = configService.get<number>('JWT_REFRESH_EXPIRATION', 604800); // 기본값 7일
        
        return {
          secret,
          accessExpiresIn,
          refreshExpiresIn
        };
      },
    }),
    // 도메인 모듈
    AuthModule,
    UserModule,
  ],
})
export class AppModule {}
