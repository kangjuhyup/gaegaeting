import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { SocialLoginCommand } from "@app/auth/application/port/in/command/social-login.port";
import { AuthEntity } from "@app/auth/domain/model/auth";
import { AuthToken } from '@app/auth/domain/model/auth-token';
import { SocialAuthProviderPort } from '@app/auth/domain/port/out/social-auth-provider.port';
import { AuthRepositoryPort } from '@app/auth/domain/port/out/auth-repository.port';
import { AuthProvider } from '@core/auth/src/type/enum/auth-provider.enum';
import { JwtPort } from '@app/auth/domain/port/out/jwt.port';

/**
 * 소셜 로그인 커맨드 핸들러    
 * 
 * 소셜 로그인 요청을 처리하고 자체 토큰을 발급하는 핸들러입니다.
 */
@CommandHandler(SocialLoginCommand)
export class SocialLoginHandler implements ICommandHandler<SocialLoginCommand, AuthEntity> {

    private readonly logger = new Logger(SocialLoginHandler.name);
    /**
     * 소셜 인증 제공자 맵
     */
    private readonly providersMap: Map<AuthProvider, SocialAuthProviderPort>;
    
    constructor(
        private readonly authRepository: AuthRepositoryPort, 
        private readonly jwtPort: JwtPort,
        @Inject('SocialAuthProviders') private readonly authProviders: SocialAuthProviderPort[],
    ) {
        // 소셜 인증 제공자 맵 초기화
        this.providersMap = new Map();
        authProviders.forEach(provider => {
            this.providersMap.set(provider.getSupportedProvider(), provider);
        });
    }
    
    /**
     * 커맨드 실행
     * 
     * @param command 소셜 로그인 커맨드
     * @returns 인증 엔티티
     */
    async execute(command: SocialLoginCommand): Promise<AuthEntity> {
        const { code, state } = command;
        
        try {
            // 카카오 인증 제공자 가져오기
            const provider = this.providersMap.get(command.provider);
            if (!provider) {
                throw new Error('카카오 인증 제공자를 찾을 수 없습니다.');
            }
            
            // 인증 코드로 카카오 액세스 토큰 요청
            const redirectUrl = `http://localhost:3000/auth/${command.provider.label.toLowerCase()}/callback`; // 프론트엔드 콜백 URL
            const kakaoToken = await provider.getAccessToken(code, redirectUrl);
            
            // 카카오 액세스 토큰으로 사용자 정보 요청
            const userProfile = await provider.getUserProfile(kakaoToken.getAccessToken());
            
            // JWT 토큰 생성 (자체 토큰)
            const accessToken = await this.jwtPort.createAccessToken({
                provider: command.provider,
                providerId: userProfile.getProviderId(),
            });
            
            const refreshToken = await this.jwtPort.createRefreshToken({
                provider: command.provider,
                providerId: userProfile.getProviderId(),
            });
            
            const expiresIn = this.jwtPort.getExpriesIn()
            // 자체 토큰 생성
            const authToken = new AuthToken({
                accessToken,
                refreshToken,
                expiresIn : expiresIn.accessToken, // 1시간
                refreshTokenExpiresIn : expiresIn.refreshToken, // 7일   
                tokenType : 'Bearer'
            });
            
            // 인증 엔티티 생성
            const authEntity = AuthEntity.of({
                provider : command.provider,
                providerId : userProfile.getProviderId(),
                authToken : authToken,
                lastLoginAt : new Date()
            });
            
            // 인증 토큰 설정
            authEntity.setAuthToken(authToken);
            
            // 마지막 로그인 시간 업데이트
            authEntity.updateLastLoginAt();

            await this.authRepository.saveAuth(authEntity);
            
            return authEntity;
            
        } catch (error) {
            throw new Error(`카카오 로그인 처리 중 오류가 발생했습니다: ${error.message}`);
        }
    }
}