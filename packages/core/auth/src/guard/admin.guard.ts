import { AdminTokenService, AdminJwtPayload } from "@app/service/admin-token.service";
import { ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * 어드민 액세스 토큰 검증을 위한 가드
 * AdminTokenService를 활용하여 토큰 검증 및 ADMIN role 확인
 */
@Injectable()
export class AdminGuard extends AuthGuard('jwt') {
    constructor(
        private readonly adminTokenService: AdminTokenService,
    ) {
        super();
    }

    /**
     * 어드민 토큰 검증 및 권한 확인
     * @param context 실행 컨텍스트
     * @returns 인증 성공 여부
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        try {
            // 토큰 추출
            const token = this.extractTokenFromRequest(request);
            if (!token) {
                throw new UnauthorizedException('어드민 인증 토큰이 없습니다.');
            }

            // 어드민 토큰 검증 (role 자동 체크됨)
            const payload: AdminJwtPayload = await this.adminTokenService.verify(token);

            // 검증된 어드민 정보를 요청 객체에 추가
            request.admin = {
                adminId: payload.adminId,
                role: payload.role,
            };

            return true;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('어드민 인증에 실패했습니다.');
        }
    }

    /**
     * 요청에서 토큰 추출
     * @param request HTTP 요청 객체
     * @returns 추출된 토큰
     */
    private extractTokenFromRequest(request: any): string | null {
        // Authorization 헤더에서 토큰 추출 (우선순위 1)
        const authHeader = request.headers?.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        // 쿠키에서 토큰 추출 (우선순위 2)
        const cookieToken = request.cookies?.adminAccessToken;
        if (cookieToken) {
            return cookieToken;
        }

        return null;
    }
}