import { Logger, Module, Provider } from "@nestjs/common";
import { AuthRepositoryPort } from "../domain/port/auth-repository.port";
import { AuthOrmRepository } from "./adapter/outbound/presistence/auth.orm.repository";
import { AuthController } from "./adapter/inbound/http/auth/auth.controller";
import { GoogleAuthAdapter } from "./adapter/outbound/api/google-auth.adapter";
import { KakaoAuthAdapter } from "./adapter/outbound/api/kakao-auth.adapter";
import { NaverAuthAdapter } from "./adapter/outbound/api/naver-auth.adapter";
import { AuthMapper } from "./adapter/outbound/presistence/mapper/auth.mapper";
import { HttpModule } from "@core/http";
import { JwtPort } from "../domain/port/jwt.port";
import { JwtAdpater } from "./adapter/outbound/jwt.adapter";
import { AdminAuthController } from "./adapter/inbound/http/auth/auth.admin.controller";

const providers : Provider[] = [
    // 매퍼 클래스
    AuthMapper,
    // 리포지토리
    {
        provide : AuthRepositoryPort,
        useClass : AuthOrmRepository
    },
    // 소셜 인증 제공자
    {
        provide: 'KAKAO_AUTH_PROVIDER',
        useClass: KakaoAuthAdapter,
    },
    {
        provide: 'NAVER_AUTH_PROVIDER',
        useClass: NaverAuthAdapter,
    },
    {
        provide: 'GOOGLE_AUTH_PROVIDER',
        useClass: GoogleAuthAdapter,
    },
    {
        provide: 'SocialAuthProviders',
        useFactory: (
          kakaoAuthAdapter: KakaoAuthAdapter,
          naverAuthAdapter: NaverAuthAdapter,
          googleAuthAdapter: GoogleAuthAdapter,
        ) => [kakaoAuthAdapter, naverAuthAdapter, googleAuthAdapter],
        inject: ['KAKAO_AUTH_PROVIDER', 'NAVER_AUTH_PROVIDER', 'GOOGLE_AUTH_PROVIDER'],
    },
    {
        provide : JwtPort,
        useClass : JwtAdpater
    }
]

@Module({
    imports: [
        // HTTP
        HttpModule.forRoot({
            logger : Logger,
        }),
       
    ],
    controllers : [
        AuthController,
        AdminAuthController
    ],
    providers : providers,
    exports : providers,
})
export class AuthInfraStructureModule{}