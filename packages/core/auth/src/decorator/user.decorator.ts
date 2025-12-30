import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { UserPrincipal } from '../type';

/**
 * 요청에서 사용자 정보를 추출하는 데코레이터
 *
 * - HTTP: `AccessGuard`가 설정한 `req.user`(또는 legacy `req.auth`)를 반환
 * - GraphQL: `GraphqlAccessGuard`가 설정한 `ctx.req.user`(또는 legacy `ctx.req.auth`)를 반환
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
  (_data: unknown, ctx: ExecutionContext): UserPrincipal => {
    const type = ctx.getType<'http' | 'graphql' | 'rpc'>();

    const request =
      type === 'graphql'
        ? GqlExecutionContext.create(ctx).getContext()?.req
        : ctx.switchToHttp().getRequest();

    const principal = request?.user ?? request?.auth;

    if (!principal) {
      throw new ForbiddenException('인증 정보가 없습니다.');
    }

    return principal as UserPrincipal;
  },
);