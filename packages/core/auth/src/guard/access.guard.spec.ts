import { jest } from '@jest/globals';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { createInternalAuthAssertion } from '@core/auth-assertion';
import { AccessGuard } from './access.guard.js';
import { InternalAuthService } from '../service/internal-auth.service.js';
import { SCOPES_KEY } from '../decorator/scopes.decorator.js';

describe('AccessGuard central auth boundary', () => {
  const secret = 'a'.repeat(64);
  const makeContext = (req: any) => ({
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}), getClass: () => ({}),
  }) as any;
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as any;
  const service = new InternalAuthService({ secret, issuer: 'gaegaeting-gateway', audience: 'account' });

  test.each([
    { query: { excludeAuth: 'true' }, headers: {} },
    { query: {}, headers: { 'x-jwt-payload': '{"userId":"forged"}' } },
    { query: {}, headers: { authorization: 'Bearer local-jwt' } },
  ])('does not allow a legacy bypass', async (request) => {
    await expect(new AccessGuard(service, reflector).canActivate(makeContext(request)))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  test('accepts a valid Gateway assertion and populates the mapped principal', async () => {
    const assertion = createInternalAuthAssertion({
      tenantId: 'tenant-a', subject: 'subject-a',
      userId: '01J00000000000000000000000', scopes: ['openid'],
    }, { secret, issuer: 'gaegaeting-gateway', audience: 'account' });
    const request: any = { headers: { 'x-gaegaeting-principal': assertion } };
    await expect(new AccessGuard(service, reflector).canActivate(makeContext(request))).resolves.toBe(true);
    expect(request.user).toMatchObject({
      tenantId: 'tenant-a', subject: 'subject-a',
      userId: '01J00000000000000000000000', scopes: ['openid'],
    });
  });

  test('rejects an assertion issued for another subgraph', async () => {
    const assertion = createInternalAuthAssertion({
      tenantId: 'tenant-a', subject: 'subject-a',
      userId: '01J00000000000000000000000', scopes: [],
    }, { secret, issuer: 'gaegaeting-gateway', audience: 'match' });
    await expect(new AccessGuard(service, reflector).canActivate(makeContext({
      headers: { 'x-gaegaeting-principal': assertion },
    }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  test('accepts a principal containing every required scope', async () => {
    const assertion = createInternalAuthAssertion({
      tenantId: 'tenant-a', subject: 'subject-a',
      userId: '01J00000000000000000000000',
      scopes: ['account:read', 'account:write'],
    }, { secret, issuer: 'gaegaeting-gateway', audience: 'account' });
    const scopedReflector = {
      getAllAndOverride: jest.fn((key: string) =>
        key === SCOPES_KEY ? ['account:read', 'account:write'] : undefined),
    } as any;

    await expect(new AccessGuard(service, scopedReflector).canActivate(makeContext({
      headers: { 'x-gaegaeting-principal': assertion },
    }))).resolves.toBe(true);
  });

  test('rejects a principal missing any required scope as forbidden', async () => {
    const assertion = createInternalAuthAssertion({
      tenantId: 'tenant-a', subject: 'subject-a',
      userId: '01J00000000000000000000000', scopes: ['account:read'],
    }, { secret, issuer: 'gaegaeting-gateway', audience: 'account' });
    const scopedReflector = {
      getAllAndOverride: jest.fn((key: string) =>
        key === SCOPES_KEY ? ['account:read', 'account:write'] : undefined),
    } as any;

    await expect(new AccessGuard(service, scopedReflector).canActivate(makeContext({
      headers: { 'x-gaegaeting-principal': assertion },
    }))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
