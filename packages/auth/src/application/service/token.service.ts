import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenServicePort, IssueTokenCommand, AuthPayloadDto, TokenMetadata } from '../port/token-service.port';
import { JwtPort } from '../port/jwt.port';
import { CacheService } from '@core/redis';
import { ENV_KEY } from '@app/common/config/env.config';
import { createHash } from 'crypto';
import { UserPrincipal } from '@core/auth';

@Injectable()
export class TokenService extends TokenServicePort {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtPort: JwtPort,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    super();
  }

  async issueForUser(cmd: IssueTokenCommand): Promise<AuthPayloadDto> {
    const secret = this.configService.get<string>(ENV_KEY.JWT_SECRET);
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const accessExpiration = this.configService.get<string>(ENV_KEY.JWT_ACCESS_EXPIRATION) || '1h';
    const refreshExpiration = this.configService.get<string>(ENV_KEY.JWT_REFRESH_EXPIRATION) || '30d';

    // JWT 페이로드 생성
    const iat = Math.floor(Date.now() / 1000);
    const expiresInSeconds = this.parseExpirationToSeconds(accessExpiration);

    const payload : UserPrincipal = {
      userId: cmd.userId,
      tenantId: cmd.tenantId,
      iat,
      ...(cmd.phoneVerified !== undefined && { phoneVerified: cmd.phoneVerified }),
      ...(cmd.emailVerified !== undefined && { emailVerified: cmd.emailVerified }),
      ...(cmd.roles && cmd.roles.length > 0 && { roles: cmd.roles }),
      ...(cmd.permissions && cmd.permissions.length > 0 && { permissions: cmd.permissions }),
      exp: iat + expiresInSeconds,
    };
    // expiresIn을 초 단위로 변환
    const refreshTokenExpiresInSeconds = this.parseExpirationToSeconds(refreshExpiration);

    // Access Token 발급
    const accessToken = await this.jwtPort.sign(payload, {
      secret,
    });

    // Refresh Token 발급
    const refreshToken = await this.jwtPort.sign(
      { ...payload, type: 'refresh' },
      {
        secret,
      },
    );

    this.logger.log(`Issued access token: ${accessToken}`);
    this.logger.log(`Issued refresh token: ${refreshToken}`);
    
    // 토큰을 Redis에 저장
    const accessTokenKey = this.getTokenKey(accessToken, 'access');
    const refreshTokenKey = this.getTokenKey(refreshToken, 'refresh');

    const accessTokenMetadata: TokenMetadata = {
      userId: cmd.userId,
      tenantId: cmd.tenantId,
      iat,
      exp: iat + expiresInSeconds,
      type: 'access',
      ...(cmd.roles && cmd.roles.length > 0 && { roles: cmd.roles }),
      ...(cmd.permissions && cmd.permissions.length > 0 && { permissions: cmd.permissions }),
    };

    const refreshTokenMetadata: TokenMetadata = {
      userId: cmd.userId,
      tenantId: cmd.tenantId,
      iat,
      exp: iat + refreshTokenExpiresInSeconds,
      type: 'refresh',
    };

    // Redis에 토큰 저장 (TTL은 토큰 만료 시간과 동일)
    await this.cacheService.set(accessTokenKey, accessTokenMetadata, expiresInSeconds, 'token');
    await this.cacheService.set(refreshTokenKey, refreshTokenMetadata, refreshTokenExpiresInSeconds, 'token');

    // 사용자별 토큰 목록에도 추가 (토큰 무효화 시 사용)
    await this.addTokenToUserList(cmd.userId, cmd.tenantId, accessToken, 'access', expiresInSeconds);
    await this.addTokenToUserList(cmd.userId, cmd.tenantId, refreshToken, 'refresh', refreshTokenExpiresInSeconds);

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInSeconds,
    };
  }

  async verifyToken(token: string): Promise<TokenMetadata | null> {
    try {
      // JWT 검증
      const secret = this.configService.get<string>(ENV_KEY.JWT_SECRET);
      if (!secret) {
        return null;
      }

      const decoded = await this.jwtPort.verify(token, { secret });
      
      // Redis에서 토큰 확인 (블랙리스트 체크)
      const tokenType = decoded.type || 'access';
      this.logger.log(`Verified token type: ${tokenType}`);
      const tokenKey = this.getTokenKey(token, tokenType);
      this.logger.log(`Token key: ${tokenKey}`);
      const metadata = await this.cacheService.get<TokenMetadata>(tokenKey, 'token');
      this.logger.log(`Token metadata: ${JSON.stringify(metadata)}`);

      if (!metadata) {
        // Redis에 없으면 토큰이 무효화된 것
        return null;
      }

      // JWT payload에서 roles와 permissions 포함 (Redis에 없을 수도 있으므로)
      return {
        ...metadata,
        ...(decoded.roles && { roles: decoded.roles }),
        ...(decoded.permissions && { permissions: decoded.permissions }),
      };
    } catch (error) {
      return null;
    }
  }

  async revokeToken(token: string): Promise<void> {
    try {
      // JWT에서 정보 추출
      const secret = this.configService.get<string>(ENV_KEY.JWT_SECRET);
      if (!secret) {
        return;
      }

      const decoded = await this.jwtPort.verify(token, { secret });
      const tokenType = decoded.type || 'access';
      const tokenKey = this.getTokenKey(token, tokenType);

      // Redis에서 토큰 삭제
      await this.cacheService.del(tokenKey, 'token');

      // 사용자별 토큰 목록에서도 제거
      if (decoded.sub && decoded.tenantId) {
        await this.removeTokenFromUserList(decoded.sub, decoded.tenantId, token, tokenType);
      }
    } catch (error) {
      // 토큰이 유효하지 않으면 무시
    }
  }

  async revokeUserTokens(userId: string, tenantId: string): Promise<void> {
    // 사용자의 모든 토큰 목록 가져오기
    const accessTokensKey = this.getUserTokensKey(userId, tenantId, 'access');
    const refreshTokensKey = this.getUserTokensKey(userId, tenantId, 'refresh');

    const accessTokens = await this.cacheService.get<string[]>(accessTokensKey, 'user-tokens') || [];
    const refreshTokens = await this.cacheService.get<string[]>(refreshTokensKey, 'user-tokens') || [];

    // 모든 토큰 무효화
    for (const token of accessTokens) {
      const tokenKey = this.getTokenKey(token, 'access');
      await this.cacheService.del(tokenKey, 'token');
    }

    for (const token of refreshTokens) {
      const tokenKey = this.getTokenKey(token, 'refresh');
      await this.cacheService.del(tokenKey, 'token');
    }

    // 사용자별 토큰 목록 삭제
    await this.cacheService.del(accessTokensKey, 'user-tokens');
    await this.cacheService.del(refreshTokensKey, 'user-tokens');
  }

  /**
   * 토큰을 키로 변환 (해시 사용)
   */
  private getTokenKey(token: string, type: 'access' | 'refresh'): string {
    // 토큰 전체를 키로 사용하면 너무 길 수 있으므로 해시 사용
    const hash = createHash('sha256').update(token).digest('hex');
    return `${type}:${hash}`;
  }

  /**
   * 사용자별 토큰 목록 키 생성
   */
  private getUserTokensKey(userId: string, tenantId: string, type: 'access' | 'refresh'): string {
    return `${tenantId}:${userId}:${type}`;
  }

  /**
   * 사용자별 토큰 목록에 토큰 추가
   */
  private async addTokenToUserList(
    userId: string,
    tenantId: string,
    token: string,
    type: 'access' | 'refresh',
    ttlSec: number,
  ): Promise<void> {
    const key = this.getUserTokensKey(userId, tenantId, type);
    const tokens = await this.cacheService.get<string[]>(key, 'user-tokens') || [];
    tokens.push(token);
    await this.cacheService.set(key, tokens, ttlSec, 'user-tokens');
  }

  /**
   * 사용자별 토큰 목록에서 토큰 제거
   */
  private async removeTokenFromUserList(
    userId: string,
    tenantId: string,
    token: string,
    type: 'access' | 'refresh',
  ): Promise<void> {
    const key = this.getUserTokensKey(userId, tenantId, type);
    const tokens = await this.cacheService.get<string[]>(key, 'user-tokens') || [];
    const filtered = tokens.filter((t) => t !== token);
    
    if (filtered.length === 0) {
      await this.cacheService.del(key, 'user-tokens');
    } else {
      // TTL은 원래 토큰의 만료 시간을 유지하기 위해 충분히 긴 시간 설정
      await this.cacheService.set(key, filtered, 86400 * 30, 'user-tokens'); // 30일
    }
  }

  /**
   * 만료 시간 문자열을 초 단위로 변환
   * 예: '1h' -> 3600, '30d' -> 2592000, '15m' -> 900
   */
  private parseExpirationToSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      // 기본값: 1시간
      return 3600;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 3600;
    }
  }
}

