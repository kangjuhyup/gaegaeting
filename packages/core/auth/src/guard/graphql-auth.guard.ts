import { Injectable, ExecutionContext, UnauthorizedException, Optional, Inject } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * GraphQL 인증 가드
 * GraphQL 컨텍스트에서 JWT 토큰을 검증하고 사용자 정보를 설정합니다.
 */
@Injectable()
export class GraphqlAuthGuard {
  private userRepository?: any;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();

    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('인증 토큰이 없습니다.');
    }

    const token = this.extractTokenFromHeader(authHeader);
    if (!token) {
      throw new UnauthorizedException('인증 토큰 형식이 올바르지 않습니다.');
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        throw new UnauthorizedException('JWT_SECRET이 설정되지 않았습니다.');
      }

      // 토큰 검증
      const payload = await this.jwtService.verifyAsync(token, { secret });
      
      // 검증된 페이로드를 요청 객체에 추가
      req.user = payload;

      // User 도메인 모델 조회 및 설정 (userRepository가 제공된 경우에만)
      if (this.userRepository && payload.sub) {
        try {
          const user = await this.userRepository.findById({
            userId: payload.sub,
          });
          if (user) {
            req._userDomainModel = user;
          }
        } catch (error) {
          // User 조회 실패는 인증 실패로 처리하지 않음 (JWT는 유효하지만 DB에 사용자가 없을 수 있음)
          // 데코레이터에서 required 옵션에 따라 처리
        }
      }
      
      return true;
    } catch (error) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
  }

  private extractTokenFromHeader(authHeader: string): string | null {
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    return parts[1];
  }
}

