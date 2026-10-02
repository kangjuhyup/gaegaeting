import { jest } from '@jest/globals';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { GraphqlAccessGuard, InternalAuthService } from '@core/auth';
import { createInternalAuthAssertion } from '@core/auth-assertion';
import { ProfileImageResolver } from '../../src/common/profile-images/profile-image.resolver.js';

const secret = 'qa'.repeat(32);
const service = new InternalAuthService({ secret, issuer: 'gaegaeting-gateway', audience: 'account' });
const guard = new GraphqlAccessGuard(service, new Reflector());

async function authorize(method: string, roles: string[], scopes: string[]) {
  const assertion = createInternalAuthAssertion({ tenantId: 'qa', subject: 'qa', userId: '01J00000000000000000000000', roles, scopes },
    { secret, issuer: 'gaegaeting-gateway', audience: 'account' });
  const req = { headers: { 'x-gaegaeting-principal': assertion } };
  jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({ getContext: () => ({ req }) } as any);
  const context = { getHandler: () => ProfileImageResolver.prototype[method], getClass: () => ProfileImageResolver } as any;
  return guard.canActivate(context);
}

describe('Only authorized administrators may review private photos', () => {
  afterEach(() => jest.restoreAllMocks());
  test.each(['adminPendingProfileImages', 'reviewProfileImage'])('%s rejects a regular account even with read/write scopes', async method => {
    await expect(authorize(method, ['USER'], ['account:read', 'account:write'])).rejects.toBeInstanceOf(ForbiddenException);
  });
  test.each(['adminPendingProfileImages', 'reviewProfileImage'])('%s rejects an administrator missing OAuth scopes', async method => {
    await expect(authorize(method, ['ADMIN'], [])).rejects.toBeInstanceOf(ForbiddenException);
  });
  test('an ADMIN with read permission can inspect the pending queue', async () => {
    await expect(authorize('adminPendingProfileImages', ['ADMIN'], ['account:read'])).resolves.toBe(true);
  });
  test('an ADMIN with write permission can approve or reject a photo', async () => {
    await expect(authorize('reviewProfileImage', ['ADMIN'], ['account:write'])).resolves.toBe(true);
  });
  test.each(['completeProfileImage', 'completePetImage'])('%s requires write scope to submit for review', async method => {
    await expect(authorize(method, ['USER'], ['account:read'])).rejects.toBeInstanceOf(ForbiddenException);
  });
});
