import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { SocialLoginCommand } from "@app/auth/application/port/in/command/social-login.port";
import { AuthEntity } from "@app/auth/domain/model/auth";
import { AuthProvider } from '@auth/domain/model/type/auth-provider.type';
import { AuthToken } from '@app/auth/domain/model/auth-token';
import { SocialAuthProviderPort } from '@app/auth/domain/port/out/social-auth-provider.port';
import { UserRepositoryPort } from '@app/auth/domain/port/out/user-repository.port';
import { AuthRepositoryPort } from '@app/auth/domain/port/out/auth-repository.port';

/**
 * 소셜 로그인 커맨드 핸들러    
 * 
 * 소셜 로그인 요청을 처리하고 자체 토큰을 발급하는 핸들러입니다.
 */
@Injectable()
@CommandHandler(SocialLoginCommand)
export class SocialLoginHandler implements ICommandHandler<SocialLoginCommand, AuthEntity> {
    /**
     * 소셜 인증 제공자 맵
     */
    private readonly providersMap: Map<AuthProvider, SocialAuthProviderPort>;
    
    constructor(
        private readonly userRepository: UserRepositoryPort, // 추후 서비스 분리가 될 경우 userApiPort 등을 통해 리팩토링
        private readonly authRepository: AuthRepositoryPort, 
        private readonly jwtService: JwtService,
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
            const redirectUrl = `http://localhost:3000/auth/${command.provider}/callback`; // 프론트엔드 콜백 URL
            const kakaoToken = await provider.getAccessToken(code, redirectUrl);
            
            // 카카오 액세스 토큰으로 사용자 정보 요청
            const userProfile = await provider.getUserProfile(kakaoToken.getAccessToken());
            
            // 사용자 정보로 사용자 조회 또는 생성
            const userId = await this.userRepository.createOrUpdateSocialUser(userProfile);
            
            // JWT 토큰 생성 (자체 토큰)
            const accessToken = this.jwtService.sign({
                sub: userId,
                provider: command.provider,
                providerId: userProfile.getProviderId(),
                email: userProfile.getEmail(),
                name: userProfile.getName(),
            }, {
                expiresIn: '1h', // 액세스 토큰 1시간 유효
            });
            
            const refreshToken = this.jwtService.sign({
                sub: userId,
                provider: command.provider,
            }, {
                expiresIn: '30d', // 리프레시 토큰 30일 유효
            });
            
            // 자체 토큰 생성
            const authToken = new AuthToken(
                accessToken,
                refreshToken,
                3600, // 1시간
                3600 * 24 * 7, // 7일   
                'Bearer'
            );
            
            // 인증 엔티티 생성
            const authEntity = AuthEntity.createFromSocialProfile(
                command.provider,
                userProfile.getProviderId()
            );
            
            // 인증 토큰 설정
            authEntity.setAuthToken(authToken);
            
            // 마지막 로그인 시간 업데이트
            authEntity.updateLastLoginAt();

            await this.authRepository.saveAuth(userId, authEntity);
            
            return authEntity;
            
        } catch (error) {
            console.error('카카오 로그인 처리 중 오류:', error);
            throw new Error(`카카오 로그인 처리 중 오류가 발생했습니다: ${error.message}`);
        }
    }
}