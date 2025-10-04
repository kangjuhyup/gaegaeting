import { AdminTokenService, AdminJwtPayload } from "@app/service/admin-token.service";
import { JwtTokenService } from "@app/service/jwt-token.service";
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

/**
 * Admin 또는 User 모두 접근 가능한 가드
 * 토큰 검증 후 admin 또는 user 정보를 request에 추가
 */
@Injectable()
export class FlexibleAuthGuard implements CanActivate {
    constructor(
        private readonly adminTokenService: AdminTokenService,
        private readonly jwtTokenService: JwtTokenService,
    ) {}

    /**
     * 토큰 검증 (Admin 또는 User)
     * @param context 실행 컨텍스트
     * @returns 인증 성공 여부
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        try {
            const token = this.extractTokenFromRequest(request);
            if (!token) {
                return false;
            }

            // Admin 토큰 검증 시도
            try {
                const adminPayload: AdminJwtPayload = await this.adminTokenService.verify(token);
                request.admin = {
                    adminId: adminPayload.adminId,
                    role: adminPayload.role,
                };
                request.authType = 'admin';
                return true;
            } catch {
                // Admin 검증 실패 시 User 검증 시도
            }

            // User 토큰 검증 시도
            try {
                const userPayload = await this.jwtTokenService.verify(token);
                request.user = userPayload;
                request.authType = 'user';
                return true;
            } catch {
                // User 검증도 실패
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * 요청에서 토큰 추출
     * @param request HTTP 요청 객체
     * @returns 추출된 토큰
     */
    private extractTokenFromRequest(request: any): string | null {
        // Authorization 헤더에서 토큰 추출
        const authHeader = request.headers?.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        // 쿠키에서 토큰 추출 (admin 우선)
        const adminCookie = request.cookies?.adminAccessToken;
        if (adminCookie) {
            return adminCookie;
        }

        const userCookie = request.cookies?.accessToken;
        if (userCookie) {
            return userCookie;
        }

        return null;
    }
}
