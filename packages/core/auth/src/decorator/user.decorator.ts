import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserPrincipal } from '../type';

/**
 * 요청에서 사용자 정보를 추출하는 데코레이터
 * 
 * AccessGuard에 의해 설정된 request.auth 객체를 UserPrincipal 타입으로 반환합니다.
 * 이 데코레이터는 AccessGuard와 함께 사용해야 합니다.
 * 
 * @example
 * ```typescript
 * @Get('/me')
 * @UseGuards(AccessGuard)
 * async getMyProfile(@UserParam() user: UserPrincipal) {
 *   // user 객체에는 userId, tenantId, roles, permissions 정보가 포함됩니다.
 *   return this.userService.getProfile(user.userId);
 * }
 * ```
 */
export const UserParam = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserPrincipal => {
    const request = ctx.switchToHttp().getRequest();
    
    // AccessGuard가 설정한 request.auth를 사용
    if (!request.auth) {
      throw new ForbiddenException('인증 정보가 없습니다.')
    }
    
    return request.auth as UserPrincipal;
  },
);