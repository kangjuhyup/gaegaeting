import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { SocialLoginByTokenCommand } from "../../port/command/social-login-by-token.port";
import { AuthEntity } from "@app/auth/domain/model/auth";
import { SocialAuthProviderPort } from "@app/auth/domain/port/social-auth-provider.port";
import { AuthProvider } from "@core/auth";
import { Inject } from "@nestjs/common";
import { AuthTokenService } from "../../service/auth-token.service";

@CommandHandler(SocialLoginByTokenCommand)
export class SocialLoginByTokenHandler implements ICommandHandler<SocialLoginByTokenCommand> {

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

    async execute(command: SocialLoginByTokenCommand): Promise<AuthEntity> {
        try {
            const provider = this.providersMap.get(command.provider);
            if (!provider) {
                throw new Error(`${command.provider.label} 인증 제공자를 찾을 수 없습니다.`);
            }
            
            // 소셜 액세스 토큰으로 사용자 정보 요청
            const userProfile = await provider.getUserProfile(command.authToken.getAccessToken());
            
            // 공통 서비스를 통해 인증 엔티티 생성 및 저장
            return await this.authTokenService.createAuthEntityFromProfile(
                command.provider,
                userProfile
            );
            
        } catch (error) {
            throw new Error(`토큰 로그인 처리 중 오류가 발생했습니다: ${error.message}`);
        }
    }
}