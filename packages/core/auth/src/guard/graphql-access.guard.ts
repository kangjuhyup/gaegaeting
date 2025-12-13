import { Injectable, ExecutionContext, UnauthorizedException, ForbiddenException, Optional, Inject } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorator/roles.decorator';
import { PERMISSIONS_KEY } from '../decorator/permissions.decorator';

/**
 * GraphQL 인증 가드
 * GraphQL 컨텍스트에서 JWT 토큰을 검증하고 사용자 정보를 설정합니다.
 */
@Injectable()
export class GraphqlAccessGuard {
  private userRepository?: any;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();

    // 1) Traefik ForwardAuth 등이 주입한 헤더 우선 사용
    const forwarded = req.headers?.['x-jwt-payload'];
    if (forwarded) {
      const payload = this.parseJwtPayloadHeader(forwarded);
      req.user = payload;
      this.assertAuthorization(context, req.user);
      return true;
    }

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
      
      this.assertAuthorization(context, req.user);
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
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

  /**
   * x-jwt-payload 헤더 파싱
   * - JSON 문자열 또는 base64(JSON) 문자열을 허용
   */
  private parseJwtPayloadHeader(value: unknown): any {
    const raw = Array.isArray(value) ? value[0] : value;
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      throw new UnauthorizedException('x-jwt-payload 형식이 올바르지 않습니다.');
    }

    const trimmed = raw.trim();

    // 1) JSON 그대로
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        throw new UnauthorizedException('x-jwt-payload JSON 파싱에 실패했습니다.');
      }
    }

    // 2) base64(JSON)
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch {
      throw new UnauthorizedException('x-jwt-payload base64 디코딩/파싱에 실패했습니다.');
    }
  }

  private assertAuthorization(context: ExecutionContext, principal: any) {
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    if (requiredRoles.length === 0 && requiredPermissions.length === 0) {
      return;
    }

    const roles: string[] = Array.isArray(principal?.roles) ? principal.roles : [];
    const permissions: string[] = Array.isArray(principal?.permissions)
      ? principal.permissions
      : [];

    const roleOk = requiredRoles.length === 0 ? true : requiredRoles.some((r) => roles.includes(r));
    const permOk =
      requiredPermissions.length === 0 ? true : requiredPermissions.some((p) => permissions.includes(p));

    if (!roleOk || !permOk) {
      throw new ForbiddenException('권한이 없습니다.');
    }
  }
}

