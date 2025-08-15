import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthProviderPrincipal } from '@app/type/auth-provider-principal.type';

/**
 * 요청에서 사용자 정보를 추출하는 데코레이터
 * 
 * AccessGuard에 의해 설정된 request.user 객체를 UserPrincipal 타입으로 반환합니다.
 * 이 데코레이터는 AccessGuard와 함께 사용해야 합니다.
 * 
 * @example
 * ```typescript
 * @Get('/me')
 * @UseGuards(AccessGuard)
 * async getMyProfile(@AuthProviderParam() authProvider: AuthProviderPrincipal) {
 *   // authProvider 객체에는 providerType,providerId 정보가 포함됩니다.
 * }
 * ```
 */
export const AuthProviderParam = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthProviderPrincipal => {
    const request = ctx.switchToHttp().getRequest();
    
    if (!request.auth) {
      throw new ForbiddenException('인증 정보가 없습니다.')
    }
    
    return request.auth as AuthProviderPrincipal;
  },
);