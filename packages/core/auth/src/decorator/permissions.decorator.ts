import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Permission 기반 인가(Authorization) 데코레이터
 *
 * @example
 * ```ts
 * @Permissions('user.read', 'user.write')
 * @UseGuards(AccessGuard)
 * ```
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);


