import { Logger, Module, Provider } from "@nestjs/common";
import { AuthRepositoryPort } from "../domain/port/out/auth-repository.port";
import { AuthOrmRepository } from "./repository/auth.repository";
import { AuthController } from "./presentation/auth/auth.controller";
import { GoogleAuthAdapter } from "./adapter/google-auth.adapter";
import { KakaoAuthAdapter } from "./adapter/kakao-auth.adapter";
import { NaverAuthAdapter } from "./adapter/naver-auth.adapter";
import { AuthMapper } from "./repository/mapper/auth.mapper";
import { DatabaseModule, DatabaseSchema } from "@core/database";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { HttpModule } from "@core/http";

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
]

@Module({
    imports: [
        // HTTP
        HttpModule.forRoot({
            logger : Logger,
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
    ],
    controllers : [
        AuthController
    ],
    providers : providers,
    exports : providers,
})
export class AuthInfraStructureModule{}