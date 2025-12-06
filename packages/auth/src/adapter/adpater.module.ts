import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisCacheModule } from '@core/redis';
import { AuthResolver } from './in/gql/auth.resolver';
import { SocialSigninUseCase } from '../application/usecase/social-signin.usecase';
import { SocialSigninUseCaseImpl } from '../application/usecase/impl/social-signin.usecase.impl';
import { KakaoIdpAdapter } from './out/kakao-idp.adapter';
import { AppleIdpAdapter } from './out/apple-idp.adapter';
import { UserRepositoryAdapter } from './out/user-repository.adapter';
import { UserIdentityRepositoryAdapter } from './out/user-identity-repository.adapter';
import { JwtServiceAdapter } from './out/jwt-service.adapter';
import { KakaoIdpPort } from '../application/port/kakao-idp.port';
import { AppleIdpPort } from '../application/port/apple-idp.port';
import { UserRepositoryPort } from '../domain/port/user-repository.port';
import { UserIdentityRepositoryPort } from '../domain/port/user-identity-repository.port';
import { TokenServicePort } from '../application/port/token-service.port';
import { SmsApiPort } from '../application/port/sms-api.port';
import { OtpRepositoryPort } from '../application/port/otp-repository.port';
import { InMemoryOtpRepository } from './out/otp-repository.inmemory';
import { OtpUsecase } from '../application/usecase/otp.usecase';
import { OtpUsecaseImpl } from '../application/usecase/impl/otp.usecase.impl';
import { UserUsecase } from '../application/usecase/user.usecase';
import { UserUsecaseImpl } from '../application/usecase/impl/user.usecase.impl';
import { AuthUsecase } from '../application/usecase/auth.usecase';
import { AuthUsecaseImpl } from '../application/usecase/impl/auth.usecase.impl';
import { TenantUsecase } from '../application/usecase/tenant.usecase';
import { TenantUsecaseImpl } from '../application/usecase/impl/tenant.usecase.impl';
import { TenantRepositoryPort } from '../domain/port/tenant-repository.port';
import { TenantRepositoryAdapter } from './out/tenant-repository.adapter';
import { UserAdminController } from './in/http/admin/v1/user-admin.controller';
import { TenantAdminController } from './in/http/admin/v1/tenant-admin.controller';
import { HealthController } from './in/http/health.controller';
import { TestController } from './in/http/test.controller';
import { SolApiAdapter } from './out/sol-api.adapter';
import { InitService } from '@app/common/service/init.service';
import { GraphqlAuthGuard } from '@app/common/guard/graphql-auth.guard';
import { ENV_KEY } from '../common/config/env.config';

@Module({
  imports: [
    JwtModule,
    ConfigModule,
    RedisCacheModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisHost = configService.get<string>(ENV_KEY.REDIS_HOST);
        const redisPort = configService.get<number>(ENV_KEY.REDIS_PORT);

        return {
          client: {
            mode: 'single',
            options: {
              url: `redis://${redisHost}:${redisPort}`,
            },
          },
          prefix: 'auth:',
        };
      },
    }),
  ],
  controllers: [
    HealthController,
    UserAdminController,
    TenantAdminController,
    TestController,
  ],
  providers: [
    InitService,
    GraphqlAuthGuard,
    AuthResolver,
    { provide: SocialSigninUseCase, useClass: SocialSigninUseCaseImpl },
    { provide: OtpUsecase, useClass: OtpUsecaseImpl },
    { provide: UserUsecase, useClass: UserUsecaseImpl },
    { provide: AuthUsecase, useClass: AuthUsecaseImpl },
    { provide: TenantUsecase, useClass: TenantUsecaseImpl },
    { provide: KakaoIdpPort, useClass: KakaoIdpAdapter },
    { provide: AppleIdpPort, useClass: AppleIdpAdapter },
    { provide: UserRepositoryPort, useClass: UserRepositoryAdapter },
    { provide: UserIdentityRepositoryPort, useClass: UserIdentityRepositoryAdapter },
    { provide: TenantRepositoryPort, useClass: TenantRepositoryAdapter },
    { provide: TokenServicePort, useClass: JwtServiceAdapter },
    { provide: SmsApiPort, useClass: SolApiAdapter },
    { provide: OtpRepositoryPort, useClass: InMemoryOtpRepository },
  ],
  exports: [],
})
export class AdapterModule {}


