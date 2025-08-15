import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserPrincipal } from '../type';

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
 * async getMyProfile(@UserParam() user: UserPrincipal) {
 *   // user 객체에는 userId, nickname, birth, region 정보가 포함됩니다.
 *   return this.userService.getProfile(user.userId);
 * }
 * ```
 */
export const UserParam = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserPrincipal => {
    const request = ctx.switchToHttp().getRequest();
    
    if (!request.user) {
      throw new ForbiddenException('유저 정보가 없습니다.')
    }
    
    return request.user as UserPrincipal;
  },
);