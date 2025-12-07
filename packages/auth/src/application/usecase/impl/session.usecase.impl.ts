import { Injectable } from '@nestjs/common';
import { SessionUsecase, SessionDto } from '../session.usecase';
import { TokenServicePort } from '../../port/token-service.port';
import { UserUsecase } from '../user.usecase';
import { CacheService } from '@core/redis';
import { createHash } from 'crypto';

interface TokenMetadata {
  userId: string;
  tenantId: string;
  iat: number;
  exp: number;
  type?: 'access' | 'refresh';
}

@Injectable()
export class SessionUsecaseImpl extends SessionUsecase {
  constructor(
    private readonly tokenService: TokenServicePort,
    private readonly userUsecase: UserUsecase,
    private readonly cacheService: CacheService,
  ) {
    super();
  }

  private getUserTokensKey(userId: string, tenantId: string, type: 'access' | 'refresh'): string {
    return `${tenantId}:${userId}:${type}`;
  }

  private getTokenKey(token: string, type: 'access' | 'refresh'): string {
    const hash = createHash('sha256').update(token).digest('hex');
    return `${type}:${hash}`;
  }

  async getUserSessions(userId: string): Promise<SessionDto[]> {
    // 사용자 정보를 가져와서 tenantId 확인
    const user = await this.userUsecase.getUser(userId);
    if (!user) {
      return [];
    }

    const tenantId = user.tenantId;
    const sessions: SessionDto[] = [];

    // Access 토큰 목록 가져오기
    const accessTokensKey = this.getUserTokensKey(userId, tenantId, 'access');
    const accessTokens = await this.cacheService.get<string[]>(accessTokensKey, 'user-tokens') || [];

    // 각 토큰의 메타데이터를 조회하여 세션 정보 구성
    for (const token of accessTokens) {
      const tokenKey = this.getTokenKey(token, 'access');
      const metadata = await this.cacheService.get<TokenMetadata>(tokenKey, 'token');
      
      if (metadata) {
        sessions.push({
          id: tokenKey,
          userId: metadata.userId,
          lastActivityAt: new Date(metadata.iat * 1000),
          createdAt: new Date(metadata.iat * 1000),
        });
      }
    }

    return sessions;
  }

  async listSessions(query: { userId?: string; page: number; limit: number }): Promise<{ items: SessionDto[]; total: number; page: number; limit: number }> {
    if (!query.userId) {
      return {
        items: [],
        total: 0,
        page: query.page,
        limit: query.limit,
      };
    }

    const sessions = await this.getUserSessions(query.userId);
    const start = (query.page - 1) * query.limit;
    const end = start + query.limit;

    return {
      items: sessions.slice(start, end),
      total: sessions.length,
      page: query.page,
      limit: query.limit,
    };
  }

  async terminateSession(sessionId: string): Promise<void> {
    // sessionId는 토큰 키이므로 직접 삭제
    await this.cacheService.del(sessionId, 'token');
  }

  async terminateAllUserSessions(userId: string): Promise<{ terminated: number }> {
    // 사용자 정보를 가져와서 tenantId 확인
    const user = await this.userUsecase.getUser(userId);
    if (!user) {
      return { terminated: 0 };
    }

    const tenantId = user.tenantId;
    
    // 삭제 전에 세션 수 계산
    const accessTokensKey = this.getUserTokensKey(userId, tenantId, 'access');
    const refreshTokensKey = this.getUserTokensKey(userId, tenantId, 'refresh');
    const accessTokens = await this.cacheService.get<string[]>(accessTokensKey, 'user-tokens') || [];
    const refreshTokens = await this.cacheService.get<string[]>(refreshTokensKey, 'user-tokens') || [];
    const totalCount = accessTokens.length + refreshTokens.length;
    
    // TokenServicePort의 revokeUserTokens 사용
    await this.tokenService.revokeUserTokens(userId, tenantId);
    
    return { terminated: totalCount };
  }
}

