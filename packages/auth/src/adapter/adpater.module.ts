import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisCacheModule } from '@core/redis';
import { AuthResolver } from './in/gql/auth.resolver';
import { SocialSigninUseCase } from '../application/usecase/social-signin.usecase';
import { SocialSigninUseCaseImpl } from '../application/usecase/impl/social-signin.usecase.impl';
import { KakaoIdpAdapter } from './out/api/kakao-idp.adapter';
import { AppleIdpAdapter } from './out/api/apple-idp.adapter';
import { UserRepositoryAdapter } from './out/repository/user-repository.adapter';
import { UserIdentityRepositoryAdapter } from './out/repository/user-identity-repository.adapter';
import { JwtAdapter } from './out/jwt.adapter';
import { KakaoIdpPort } from '../application/port/api/kakao-idp.port';
import { AppleIdpPort } from '../application/port/api/apple-idp.port';
import { UserRepositoryPort } from '../application/port/repository/user-repository.port';
import { UserIdentityRepositoryPort } from '../application/port/repository/user-identity-repository.port';
import { TokenServicePort } from '../application/port/token-service.port';
import { TokenService } from '../application/service/token.service';
import { JwtPort } from '../application/port/jwt.port';
import { SmsApiPort } from '../application/port/api/sms-api.port';
import { OtpRepositoryPort } from '../application/port/repository/otp-repository.port';
import { RedisOtpRepository } from './out/repository/otp-repository.redis';
import { OtpUsecase } from '../application/usecase/otp.usecase';
import { OtpUsecaseImpl } from '../application/usecase/impl/otp.usecase.impl';
import { UserUsecase } from '../application/usecase/user.usecase';
import { UserUsecaseImpl } from '../application/usecase/impl/user.usecase.impl';
import { AuthUsecase } from '../application/usecase/auth.usecase';
import { AuthUsecaseImpl } from '../application/usecase/impl/auth.usecase.impl';
import { TenantUsecase } from '../application/usecase/tenant.usecase';
import { TenantUsecaseImpl } from '../application/usecase/impl/tenant.usecase.impl';
import { SessionUsecase } from '../application/usecase/session.usecase';
import { SessionUsecaseImpl } from '../application/usecase/impl/session.usecase.impl';
import { TenantRepositoryPort } from '../application/port/repository/tenant-repository.port';
import { TenantRepositoryAdapter } from './out/repository/tenant-repository.adapter';
import { RoleRepositoryPort } from '../application/port/repository/role-repository.port';
import { RoleRepositoryAdapter } from './out/repository/role-repository.adapter';
import { PermissionRepositoryPort } from '../application/port/repository/permission-repository.port';
import { PermissionRepositoryAdapter } from './out/repository/permission-repository.adapter';
import { RoleUsecase } from '../application/usecase/role.usecase';
import { RoleUsecaseImpl } from '../application/usecase/impl/role.usecase.impl';
import { PermissionUsecase } from '../application/usecase/permission.usecase';
import { PermissionUsecaseImpl } from '../application/usecase/impl/permission.usecase.impl';
import { UserService } from '../application/service/user.service';
import { OtpService } from '../application/service/otp.service';
import { TenantService } from '../application/service/tenant.service';
import { RoleService } from '../application/service/role.service';
import { PermissionService } from '../application/service/permission.service';
import { UserServicePort } from '../application/port/user-service.port';
import { OtpServicePort } from '../application/port/otp-service.port';
import { TenantServicePort } from '../application/port/tenant-service.port';
import { RoleServicePort } from '../application/port/role-service.port';
import { PermissionServicePort } from '../application/port/permission-service.port';
import { UserAdminController } from './in/http/admin/v1/user-admin.controller';
import { TenantAdminController } from './in/http/admin/v1/tenant-admin.controller';
import { RoleAdminController } from './in/http/admin/v1/role-admin.controller';
import { HealthController } from './in/http/health.controller';
import { TestController } from './in/http/test.controller';
import { SolApiAdapter } from './out/api/sol-api.adapter';
import { InitService } from '@app/common/service/init.service';
import { GraphqlAuthGuard } from '@core/auth';
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
    RoleAdminController,
    TestController,
  ],
  providers: [
    InitService,
    {
      provide: GraphqlAuthGuard,
      useFactory: (jwtService: JwtService, configService: ConfigService, userRepository: UserRepositoryPort) => {
        const guard = new GraphqlAuthGuard(jwtService, configService);
        // UserRepositoryPort를 guard에 주입하기 위해 private 필드에 직접 설정
        (guard as any).userRepository = userRepository;
        return guard;
      },
      inject: [JwtService, ConfigService, UserRepositoryPort],
    },
    AuthResolver,
    { provide: UserServicePort, useClass: UserService },
    { provide: OtpServicePort, useClass: OtpService },
    { provide: TenantServicePort, useClass: TenantService },
    { provide: RoleServicePort, useClass: RoleService },
    { provide: PermissionServicePort, useClass: PermissionService },
    { provide: JwtPort, useClass: JwtAdapter },
    { provide: TokenServicePort, useClass: TokenService },
    { provide: SocialSigninUseCase, useClass: SocialSigninUseCaseImpl },
    { provide: OtpUsecase, useClass: OtpUsecaseImpl },
    { provide: UserUsecase, useClass: UserUsecaseImpl },
    { provide: AuthUsecase, useClass: AuthUsecaseImpl },
    { provide: TenantUsecase, useClass: TenantUsecaseImpl },
    { provide: SessionUsecase, useClass: SessionUsecaseImpl },
    { provide: RoleUsecase, useClass: RoleUsecaseImpl },
    { provide: PermissionUsecase, useClass: PermissionUsecaseImpl },
    { provide: KakaoIdpPort, useClass: KakaoIdpAdapter },
    { provide: AppleIdpPort, useClass: AppleIdpAdapter },
    { provide: UserRepositoryPort, useClass: UserRepositoryAdapter },
    { provide: UserIdentityRepositoryPort, useClass: UserIdentityRepositoryAdapter },
    { provide: TenantRepositoryPort, useClass: TenantRepositoryAdapter },
    { provide: RoleRepositoryPort, useClass: RoleRepositoryAdapter },
    { provide: PermissionRepositoryPort, useClass: PermissionRepositoryAdapter },
    { provide: SmsApiPort, useClass: SolApiAdapter },
    { provide: OtpRepositoryPort, useClass: RedisOtpRepository },
  ],
  exports: [],
})
export class AdapterModule {}


