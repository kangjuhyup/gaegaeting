import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminPrincipal } from '../type';

/**
 * 요청에서 어드민 정보를 추출하는 데코레이터
 *
 * AdminGuard에 의해 설정된 request.admin 객체를 AdminPrincipal 타입으로 반환합니다.
 * 이 데코레이터는 AdminGuard와 함께 사용해야 합니다.
 *
 * @example
 * ```typescript
 * @Get('/admin/users')
 * @UseGuards(AdminGuard)
 * async getAllUsers(@Admin() admin: AdminPrincipal) {
 *   // admin 객체에는 adminId, role 정보가 포함됩니다.
 *   return this.userService.getAllUsers(admin.adminId);
 * }
 * ```
 */
export const Admin = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AdminPrincipal => {
    const request = ctx.switchToHttp().getRequest();

    if (!request.admin) {
      throw new ForbiddenException('어드민 정보가 없습니다.');
    }

    return request.admin as AdminPrincipal;
  },
);
