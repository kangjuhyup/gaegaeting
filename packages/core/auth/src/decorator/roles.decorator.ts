import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Role 기반 인가(Authorization) 데코레이터
 *
 * @example
 * ```ts
 * @Roles('ADMIN')
 * @UseGuards(AccessGuard)
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);


