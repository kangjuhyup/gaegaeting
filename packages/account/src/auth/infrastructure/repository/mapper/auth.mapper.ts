import { AuthOrmEntity, AuthProvider } from '@core/database';
import { AuthEntity } from '@app/auth/domain/model/auth';
import { AuthToken } from '@app/auth/domain/model/auth-token';
import { Injectable } from '@nestjs/common';

/**
 * 인증 매퍼
 * 
 * AuthEntity와 AuthOrmEntity 간의 변환을 담당하는 매퍼 클래스입니다.
 */
@Injectable()
export class AuthMapper {
  /**
   * AuthEntity를 AuthOrmEntity로 변환
   * 
   * @param auth 도메인 인증 엔티티
   * @returns ORM 인증 엔티티
   */
  toOrmEntity(auth: AuthEntity): AuthOrmEntity {
    const ormEntity = new AuthOrmEntity();
    
    // 기본 정보 매핑
    if (auth.getUserId()) {
      ormEntity.user.id = auth.getUserId();
    }
    
    // 인증 제공자 정보 매핑
    ormEntity.authProvider = auth.getProvider();
    ormEntity.authProviderId = auth.getProviderId() || null;
    
    // 토큰 정보 매핑
    const authToken = auth.getAuthToken();
    if (authToken) {
      ormEntity.refreshToken = authToken.getRefreshToken() || null;
      
      // 리프레시 토큰 만료일 계산
      if (authToken.getRefreshTokenExpiresIn()) {
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + authToken.getRefreshTokenExpiresIn());
        ormEntity.refreshTokenExpiresAt = expiresAt;
      } else {
        ormEntity.refreshTokenExpiresAt = null;
      }
    }
    
    // 세션 정보 매핑
    ormEntity.lastLoginAt = auth.getLastLoginAt() || new Date();
    ormEntity.lastLoginIp = null; // 필요시 추가 구현
    ormEntity.lastLoginDevice = null; // 필요시 추가 구현
    ormEntity.lastLoginLocation = null; // 필요시 추가 구현
    
    // 메타데이터 매핑
    ormEntity.createdAt = new Date();
    ormEntity.updatedAt = new Date();
    
    return ormEntity;
  }
  
  /**
   * AuthOrmEntity를 AuthEntity로 변환
   * 
   * @param ormEntity ORM 인증 엔티티
   * @returns 도메인 인증 엔티티
   */
  toDomainEntity(ormEntity: AuthOrmEntity): AuthEntity {
    // 인증 토큰 생성
    let authToken: AuthToken | undefined;
    if (ormEntity.refreshToken) {
      // 리프레시 토큰 만료 시간 계산 (초 단위)
      let refreshTokenExpiresIn: number | undefined;
      if (ormEntity.refreshTokenExpiresAt) {
        const now = new Date();
        refreshTokenExpiresIn = Math.floor((ormEntity.refreshTokenExpiresAt.getTime() - now.getTime()) / 1000);
        if (refreshTokenExpiresIn < 0) refreshTokenExpiresIn = 0;
      }
      
      authToken = new AuthToken(
        '', // 액세스 토큰은 ORM에 저장하지 않음
        ormEntity.refreshToken,
        0, // 액세스 토큰 만료 시간은 ORM에 저장하지 않음
        refreshTokenExpiresIn,
        'bearer', // 기본값
      );
    }
    
    // AuthEntity 생성
    const authEntity = new AuthEntity(
      {
        provider : ormEntity.authProvider,
        userId: ormEntity.user.id,
        providerId: ormEntity.authProviderId || undefined,
        authToken: authToken,
        lastLoginAt: ormEntity.lastLoginAt || undefined
      }
    );
    
    return authEntity;
  }
}
