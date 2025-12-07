import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpLoggerModule } from '@core/logger';
import { GatewayModule } from './gateway/gateway.module';
import { validationSchema } from './config/env.config';

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
      name: 'Gateway',
      level: 'info',
    }),
    // Apollo Federation Gateway
    GatewayModule,
  ],
})
export class AppModule {}

