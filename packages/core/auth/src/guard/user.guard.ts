import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { UserPrincipal } from "../type";

/**
 * 사용자 인증 정보 확인 가드
 * 
 * AccessGuard에 의해 설정된 request.auth를 확인하고,
 * request.user에 UserPrincipal을 설정합니다.
 * 이제 UserPrincipal은 TokenMetadata와 동일한 구조를 가집니다.
 */
@Injectable()
export class UserGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        
        // AccessGuard가 설정한 request.auth 확인
        if (!request.auth) {
            throw new ForbiddenException('인증 정보가 없습니다.');
        }
        
        // request.auth를 UserPrincipal로 설정
        // UserPrincipal은 이제 TokenMetadata와 동일한 구조입니다.
        request.user = request.auth as UserPrincipal;
        
        return true;
    }
}