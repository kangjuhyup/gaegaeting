import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

/**
 * 환경 변수 검증 오류
 */
export class AuthConfigValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthConfigValidationError';
    }
}

/**
 * 인증 모듈 환경변수 검증 결과
 */
export interface AuthConfigValidationResult {
    secret: string;
    accessExpiresIn: number;
    refreshExpiresIn: number;
}

/**
 * 인증 모듈 환경변수 검증 클래스
 * JWT 관련 환경변수를 검증하고 필요한 값을 반환
 */
export class AuthConfigValidator {
    private readonly logger = new Logger('AuthConfigValidator');

    /**
     * 환경변수 검증 및 값 반환
     * @param configService NestJS ConfigService
     * @returns 검증된 환경변수 값
     * @throws AuthConfigValidationError 필수 환경변수가 없는 경우
     */
    static validate(configService: ConfigService): AuthConfigValidationResult {
        // JWT_SECRET 필수 값 검증
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
            const errorMessage = 'JWT_SECRET 환경 변수가 정의되지 않았습니다. 인증 모듈을 사용하려면 JWT_SECRET을 설정해야 합니다.';
            throw new AuthConfigValidationError(errorMessage);
        }
        
        // JWT_ACCESS_EXPIRATION 값 검증
        const accessExpiresIn = configService.get<number>('JWT_ACCESS_EXPIRATION', 60 * 60 * 1000); // 1h
        if (!accessExpiresIn) {
            throw new AuthConfigValidationError('JWT_ACCESS_EXPIRATION 환경 변수가 정의되지 않았습니다. 인증 모듈을 사용하려면 JWT_ACCESS_EXPIRATION을 설정해야 합니다.');
        }

        // JWT_REFRESH_EXPIRATION 값 검증 (선택적)
        const refreshExpiresIn = configService.get<number>('JWT_REFRESH_EXPIRATION', 60 * 60 * 24000 * 7); // 7d
        if (!refreshExpiresIn) {
            throw new AuthConfigValidationError('JWT_REFRESH_EXPIRATION 환경 변수가 정의되지 않았습니다. 인증 모듈을 사용하려면 JWT_REFRESH_EXPIRATION을 설정해야 합니다.');
        }
        return {
            secret,
            accessExpiresIn,
            refreshExpiresIn
        };
    }
}
