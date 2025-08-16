import { AuthProvider } from '@core/auth/src/type/enum/auth-provider.enum';
import { AuthToken } from './auth-token';
import { PersistenceEntity } from '@core/model';

export interface IAuth {
    userId?: string;
    provider: AuthProvider;
    email?: string;
    password?: string;
    providerId?: string;
    authCode?: string;
    authToken?: AuthToken;
    lastLoginAt?: Date;
}

/**
 * 인증 엔티티
 * 
 * 사용자 로그인 정보를 담는 도메인 모델입니다.
 * 컨트롤러 -> 커맨드 -> 외부 API 프로세스에서 사용됩니다.
 */
export class AuthEntity extends PersistenceEntity<{providerType: AuthProvider, providerId: string},IAuth> {
   
    constructor(
        auth : IAuth
    ) {
        super(auth)
    }

    static of(param : IAuth) {
        return new AuthEntity(param)
    }
    
    /**
     * 사용자 ID 반환
     */
    getUserId(): string | undefined {
        return this.etc.userId;
    }
    
    /**
     * 인증 제공자 반환
     */
    getProvider(): AuthProvider {
        return this.etc.provider;
    }
    
    /**
     * 이메일 반환
     */
    getEmail(): string | undefined {
        return this.etc.email;
    }
    
    /**
     * 비밀번호 반환
     */
    getPassword(): string | undefined {
        return this.etc.password;
    }
    
    /**
     * 제공자 ID 반환
     */
    getProviderId(): string | undefined {
        return this.etc.providerId;
    }
    
    /** 
     * 인증 코드 반환
     */
    getAuthCode(): string | undefined {
        return this.etc.authCode;
    }
    
    /**
     * 인증 토큰 반환
     */
    getAuthToken(): AuthToken | undefined {
        return this.etc.authToken;
    }
    
    /**
     * 인증 토큰 설정
     * 
     * @param authToken 인증 토큰
     */
    setAuthToken(authToken: AuthToken): void {
        this.etc.authToken = authToken;
    }
    
    /**
     * 마지막 로그인 시간 반환
     */
    getLastLoginAt(): Date | undefined {
        return this.etc.lastLoginAt;
    }
    
    /**
     * 마지막 로그인 시간 업데이트
     */
    updateLastLoginAt(): void {
        this.etc.lastLoginAt = new Date();
    }
    
    /**
     * 이메일 로그인 여부 확인
     */
    isEmailAuth(): boolean {
        return this.etc.provider === AuthProvider.EMAIL;
    }
    
    /**
     * 소셜 로그인 여부 확인
     */
    isSocialAuth(): boolean {
        return this.etc.provider !== AuthProvider.EMAIL;
    }
    
    /**
     * 로그인 가능 여부 확인
     */
    canLogin(): boolean {
        if (this.isEmailAuth()) {
            return !!this.etc.email && !!this.etc.password;
        } else {
            return !!this.etc.authCode || !!this.etc.providerId;
        }
    }
}