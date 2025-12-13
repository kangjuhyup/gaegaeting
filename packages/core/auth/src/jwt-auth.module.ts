import { DynamicModule, Module, Type, Provider, Global } from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { JwtTokenService } from "./service/jwt-token.service";
import { AccessGuard } from "./guard/access.guard";
import { GraphqlAccessGuard } from "./guard";

// AUTH_MODULE_OPTIONS 상수 정의
export const AUTH_MODULE_OPTIONS = 'AUTH_MODULE_OPTIONS';

/**
 * 인증 모듈 옵션
 */
export interface AuthModuleOptions {
    /**
     * JWT 토큰 서명에 사용할 비밀 키
     */
    secret: string;
    
    /**
     * 액세스 토큰 만료 시간 (초 단위 숫자)
     */
    accessExpiresIn: number;
    
    /**
     * 리프레시 토큰 만료 시간 (초 단위 숫자)
     */
    refreshExpiresIn: number;

    /**
     * UserPrincipal 을 조회하기 위한 서비스 호스트
     */
    userServiceHost : string;
}

/**
 * 환경 변수 검증 오류
 */
export { AuthConfigValidationError } from "./config/auth-config.validator";

/**
 * 비동기 인증 모듈 옵션
 */
export interface AuthModuleAsyncOptions {
    imports?: any[];
    useFactory?: (...args: any[]) => Promise<AuthModuleOptions> | AuthModuleOptions;
    useClass?: Type<any>;
    useExisting?: Type<any>;
    inject?: any[];
}

/**
 * 인증 모듈
 * JWT 기반 인증 기능 제공
 */
@Global()
@Module({})
export class JwtAuthModule {
    /**
     * 정적 설정으로 모듈 초기화
     * @param options 인증 모듈 옵션을 직접 전달
     * @returns 동적 모듈 설정
     */
    static forRoot(options: AuthModuleOptions): DynamicModule {
        return {
            module: JwtAuthModule,
            imports: [
                JwtModule.register({
                    secret: options.secret,
                    signOptions: {
                        expiresIn: options.accessExpiresIn,
                    },
                }),
            ],
            providers: [
                {
                    provide: AUTH_MODULE_OPTIONS,
                    useValue: options,
                },
                {
                    provide: JwtTokenService,
                    useFactory: (authOptions: AuthModuleOptions, jwtService: JwtService) => {
                        return new JwtTokenService(
                            jwtService,
                            authOptions.secret,
                            authOptions.accessExpiresIn,
                            authOptions.refreshExpiresIn
                        );
                    },
                    inject: [AUTH_MODULE_OPTIONS, JwtService]
                },
                AccessGuard,
                GraphqlAccessGuard
            ],
            exports: [
                JwtModule,
                JwtTokenService,
                AccessGuard,
                GraphqlAccessGuard
            ],
        };
    }

    /**
     * 비동기 설정으로 모듈 초기화
     * @param options 비동기 인증 모듈 옵션
     * @returns 동적 모듈 설정
     */
    static forRootAsync(
        options: AuthModuleAsyncOptions
    ): DynamicModule {
        const asyncProviders = this.createAsyncProviders(options);
        
        return {
            module: JwtAuthModule,
            imports: [
                ...(options.imports || []),
                JwtModule.registerAsync({
                    imports: options.imports || [],
                    inject: options.inject || [],
                    useFactory: async (...args: any[]) => {
                        const authOptions = await options.useFactory(...args);
                        return {
                            secret: authOptions.secret,
                            signOptions: {
                                expiresIn: authOptions.accessExpiresIn,
                            },
                        };
                    },
                }),
            ],
            providers: [
                ...asyncProviders,
                {
                    provide: JwtTokenService,
                    useFactory: async (authOptions: AuthModuleOptions, jwtService: JwtService) => {
                        return new JwtTokenService(
                            jwtService,
                            authOptions.secret,
                            authOptions.accessExpiresIn,
                            authOptions.refreshExpiresIn
                        );
                    },
                    inject: [AUTH_MODULE_OPTIONS, JwtService]
                },
                AccessGuard,
                GraphqlAccessGuard
            ],
            exports: [
                JwtModule,
                JwtTokenService,
                AccessGuard,
                GraphqlAccessGuard,
            ],
        };
    }

    /**
     * 비동기 프로바이더 생성
     * @param options 비동기 인증 모듈 옵션
     * @returns 프로바이더 배열
     */
    private static createAsyncProviders(options: AuthModuleAsyncOptions): Provider[] {
        if (options.useFactory || options.useExisting || options.useClass) {
            return [
                {
                    provide: AUTH_MODULE_OPTIONS,
                    useFactory: options.useFactory,
                    inject: options.inject || [],
                },
            ];
        }
        return [];
    }
}