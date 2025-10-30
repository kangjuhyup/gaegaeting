import { Module } from '@nestjs/common';
import { AuthResolver } from './in/gql/auth.resolver';
import { SocialSigninUseCase } from '../application/usecase/social-signin.usecase';
import { KakaoIdpAdapter } from './out/kakao-idp.adapter';
import { AppleIdpAdapter } from './out/apple-idp.adapter';
import { InMemoryUserRepository } from './out/user-repository.inmemory';
import { SimpleTokenService } from './out/token-service.simple';
import { KakaoIdpPort } from '../application/port/kakao-idp.port';
import { AppleIdpPort } from '../application/port/apple-idp.port';
import { UserRepositoryPort } from '../application/port/user-repository.port';
import { TokenServicePort } from '../application/port/token-service.port';
import { NaverCloudApiPort } from '../application/port/naver-cloud-api.port';
import { OtpRepositoryPort } from '../application/port/otp-repository.port';
import { NaverCloudApiAdapter } from './out/naver-cloud-api.adapter';
import { InMemoryOtpRepository } from './out/otp-repository.inmemory';
import { OtpUsecase } from '../application/usecase/otp.usecase';

@Module({
  providers: [
    AuthResolver,
    SocialSigninUseCase,
    OtpUsecase,
    { provide: KakaoIdpPort, useClass: KakaoIdpAdapter },
    { provide: AppleIdpPort, useClass: AppleIdpAdapter },
    { provide: UserRepositoryPort, useClass: InMemoryUserRepository },
    { provide: TokenServicePort, useClass: SimpleTokenService },
    { provide: NaverCloudApiPort, useClass: NaverCloudApiAdapter },
    { provide: OtpRepositoryPort, useClass: InMemoryOtpRepository },
  ],
  exports: [],
})
export class AdapterModule {}


