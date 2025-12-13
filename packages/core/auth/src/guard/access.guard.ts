import { JwtTokenService } from "@app/service";
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorator/permissions.decorator";
import { ROLES_KEY } from "../decorator/roles.decorator";

/**
 * 액세스 토큰 검증을 위한 가드
 * - (ForwardAuth) x-jwt-payload 헤더가 있으면 이를 우선 사용
 * - 없으면 Authorization/Cookie의 JWT를 직접 검증
 */
@Injectable()
export class AccessGuard implements CanActivate {
    constructor(
        private readonly jwtTokenService: JwtTokenService,
        private readonly reflector: Reflector,
    ) {
    }

    /**
     * 토큰 검증 및 사용자 인증
     * @param context 실행 컨텍스트
     * @returns 인증 성공 여부
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        // 쿼리 파라미터에서 토큰 제외 옵션 확인
        const request = context.switchToHttp().getRequest();
        const excludeAuth = request.query?.excludeAuth === 'true';
        
        if (excludeAuth) {
            return true;
        }
        
        try {
            // 1) Traefik ForwardAuth 등이 주입한 헤더 우선 사용
            const forwarded = request.headers?.['x-jwt-payload'];
            if (forwarded) {
                request.auth = this.parseJwtPayloadHeader(forwarded);
                this.assertAuthorization(context, request.auth);
                return true;
            }

            // 토큰 추출
            const token = this.extractTokenFromRequest(request);
            if (!token) {
                throw new UnauthorizedException('인증 토큰이 없습니다.');
            }
            
            // 토큰 검증
            const payload = await this.jwtTokenService.verify(token);
            
            // 검증된 페이로드를 요청 객체에 추가
            request.auth = payload;

            this.assertAuthorization(context, request.auth);
            return true;
        } catch (error) {
            // 인가 에러는 그대로 전달
            if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new UnauthorizedException('유효하지 않은 토큰입니다.');
        }
    }

    /**
     * 요청에서 토큰 추출
     * @param request HTTP 요청 객체
     * @returns 추출된 토큰
     */
    private extractTokenFromRequest(request: any): string | null {
        // 쿠키에서 토큰 추출 시도
        const cookieToken = request.cookies?.accessToken;
        if (cookieToken) {
            return cookieToken;
        }
        
        // Authorization 헤더에서 토큰 추출 시도
        const authHeader = request.headers?.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7); // 'Bearer ' 제거
        }
        
        return null;
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

    /**
     * @Roles / @Permissions 메타데이터 기반 인가 검사
     * - roles/permissions 각각은 ANY-OF
     * - 둘 다 지정되면 AND(둘 다 만족해야 통과)
     */
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
        const permissions: string[] = Array.isArray(principal?.permissions) ? principal.permissions : [];

        const roleOk = requiredRoles.length === 0 ? true : requiredRoles.some(r => roles.includes(r));
        const permOk = requiredPermissions.length === 0 ? true : requiredPermissions.some(p => permissions.includes(p));

        if (!roleOk || !permOk) {
            throw new ForbiddenException('권한이 없습니다.');
        }
    }
}