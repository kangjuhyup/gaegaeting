import { Injectable } from '@nestjs/common';
import { AuthEntity } from '@app/auth/domain/model/auth';
import { AuthToken } from '@app/auth/domain/model/auth-token';
import { AuthRepositoryPort } from '@app/auth/domain/port/auth-repository.port';
import { JwtPort } from '@app/auth/domain/port/jwt.port';
import { AuthProvider } from '@core/auth';
import { SocialUserProfile } from '@app/auth/domain/model/auth-provider';
import { AcocuntApiPort } from '@app/auth/domain/port/account-api.port';

/**
 * 인증 토큰 서비스
 * 
 * 인증 토큰 생성 및 관리를 위한 공통 서비스입니다.
 */
@Injectable()
export class AuthTokenService {
    constructor(
        private readonly authRepository: AuthRepositoryPort,
        private readonly accountApi : AcocuntApiPort,
        private readonly jwtPort: JwtPort,
    ) {}

    /**
     * 사용자 프로필 정보로 인증 엔티티 생성
     * 
     * @param provider 인증 제공자
     * @param userProfile 사용자 프로필
     * @returns 인증 엔티티
     */
    async createAuthEntityFromProfile(
        provider: AuthProvider,
        userProfile: SocialUserProfile,
    ): Promise<AuthEntity> {
        try {
            const { profileRegistered , phoneVerified, petRegistered } = await this.accountApi.checkRegisted(provider.value,userProfile.getProviderId())
            // JWT 토큰 생성 (자체 토큰)
            const accessToken = await this.jwtPort.createAccessToken({
                provider: provider,
                providerId: userProfile.getProviderId(),
                profileRegistered,
                phoneVerified,
                petRegistered
            });
            
            const refreshToken = await this.jwtPort.createRefreshToken({
                provider: provider,
                providerId: userProfile.getProviderId(),
            });
            
            const expiresIn = this.jwtPort.getExpriesIn();
            
            // 자체 토큰 생성
            const authToken = new AuthToken({
                accessToken,
                refreshToken,
                expiresIn: expiresIn.accessToken, // 1시간
                refreshTokenExpiresIn: expiresIn.refreshToken, // 7일   
                tokenType: 'Bearer'
            });
            
            // 인증 엔티티 생성
            const authEntity = AuthEntity.of({
                provider: provider,
                providerId: userProfile.getProviderId(),
                authToken: authToken,
                lastLoginAt: new Date()
            });
            
            // 인증 토큰 설정
            authEntity.setAuthToken(authToken);
            
            // 마지막 로그인 시간 업데이트
            authEntity.updateLastLoginAt();

            // 인증 정보 저장
            await this.authRepository.saveAuth(authEntity);
            
            return authEntity;
        } catch (error) {
            throw new Error(`인증 엔티티 생성 중 오류가 발생했습니다: ${error.message}`);
        }
    }

    async createAdminToken(id : string) {
        // JWT 토큰 생성 (자체 토큰)
        const accessToken = await this.jwtPort.createAccessToken({
            role : 'ADMIN',
            id
        });
            
        const refreshToken = await this.jwtPort.createRefreshToken({
            role : 'ADMIN',
            id
        });
            
        const expiresIn = this.jwtPort.getExpriesIn();
            
        // 자체 토큰 생성
        const authToken = new AuthToken({
            accessToken,
            refreshToken,
            expiresIn: expiresIn.accessToken, // 1시간
            refreshTokenExpiresIn: expiresIn.refreshToken, // 7일   
            tokenType: 'Bearer'
        });
        return authToken
    }
}
