import { JwtTokenService } from "@app/service";
import { ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * 액세스 토큰 검증을 위한 가드
 * Passport JWT 전략을 활용하여 토큰 검증
 */
@Injectable()
export class AccessGuard extends AuthGuard('jwt') {
    constructor(
        private readonly jwtTokenService: JwtTokenService,
    ) {
        super();
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
            // 토큰 추출
            const token = this.extractTokenFromRequest(request);
            if (!token) {
                throw new UnauthorizedException('인증 토큰이 없습니다.');
            }
            
            // 토큰 검증
            const payload = await this.jwtTokenService.verify(token);
            
            // 검증된 페이로드를 요청 객체에 추가
            request.user = payload;
            
            return true;
        } catch (error) {
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
}