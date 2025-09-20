import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { SocialLoginCommand } from "@app/auth/application/port/command/social-login.port";
import { AuthEntity } from "@app/auth/domain/model/auth";
import { SocialAuthProviderPort } from '@app/auth/domain/port/social-auth-provider.port';
import { AuthProvider } from '@core/auth';
import { AuthTokenService } from '../../service/auth-token.service';
import { Transactional } from "@core/database";

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
        private readonly authTokenService: AuthTokenService,
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
    @Transactional()
    async execute(command: SocialLoginCommand): Promise<AuthEntity> {
        const { code, state } = command;
        
        try {
            // 소셜 인증 제공자 가져오기
            const provider = this.providersMap.get(command.provider);
            if (!provider) {
                throw new Error(`${command.provider.label} 인증 제공자를 찾을 수 없습니다.`);
            }
            
            // 인증 코드로 소셜 액세스 토큰 요청
            const redirectUrl = `http://localhost:3000/auth/${command.provider.label.toLowerCase()}/callback`; // 프론트엔드 콜백 URL
            const socialToken = await provider.getAccessToken(code, redirectUrl);
            
            // 소셜 액세스 토큰으로 사용자 정보 요청
            const userProfile = await provider.getUserProfile(socialToken.getAccessToken());
            
            // 공통 서비스를 통해 인증 엔티티 생성 및 저장
            return await this.authTokenService.createAuthEntityFromProfile(
                command.provider,
                userProfile
            );
            
        } catch (error) {
            throw new Error(`로그인 처리 중 오류가 발생했습니다: ${error.message}`);
        }
    }
}