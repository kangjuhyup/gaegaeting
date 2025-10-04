import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AdminPrincipal } from '@app/type/admin-principal.type';

/**
 * 현재 인증된 사용자(Admin 또는 User) 정보를 가져오는 데코레이터
 *
 * FlexibleAuthGuard에 의해 설정된 request.admin 또는 request.user 객체를 타입 안전하게 반환합니다.
 * 이 데코레이터는 FlexibleAuthGuard와 함께 사용해야 합니다.
 *
 * @example
 * ```typescript
 * @Get('/posts/:id')
 * @UseGuards(FlexibleAuthGuard)
 * async getPost(
 *   @Param('id') id: string,
 *   @CurrentAuth() auth: CurrentAuthType
 * ) {
 *   if (auth?.type === 'admin') {
 *     // Admin으로 인증된 경우
 *     console.log(auth.admin.adminId);
 *     return this.postService.getPostForAdmin(id);
 *   } else if (auth?.type === 'user') {
 *     // User로 인증된 경우
 *     console.log(auth.user.userId);
 *     return this.postService.getPostForUser(id);
 *   }
 *   throw new UnauthorizedException();
 * }
 * ```
 */
export const CurrentAuth = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();

        if (request.authType === 'admin') {
            return {
                type: 'admin' as const,
                admin: request.admin as AdminPrincipal,
            };
        }

        if (request.authType === 'user') {
            return {
                type: 'user' as const,
                user: request.user,
            };
        }

        return null;
    },
);

/**
 * CurrentAuth 데코레이터의 반환 타입
 */
export type CurrentAuthType =
    | { type: 'admin'; admin: AdminPrincipal }
    | { type: 'user'; user: any }
    | null;
