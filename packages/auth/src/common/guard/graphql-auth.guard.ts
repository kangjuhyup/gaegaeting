import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ENV_KEY } from '@app/common/config/env.config';
import { UserRepositoryPort } from '@app/application/port/repository/user-repository.port';
import { User } from '@app/domain/model/user';

@Injectable()
export class GraphqlAuthGuard {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepositoryPort,
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
      const secret = this.configService.get<string>(ENV_KEY.JWT_SECRET);

      // 토큰 검증
      const payload = await this.jwtService.verifyAsync(token, { secret });
      
      // 검증된 페이로드를 요청 객체에 추가
      req.user = payload;

      // User 도메인 모델 조회 및 설정
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

