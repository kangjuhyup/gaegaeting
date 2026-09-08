import { jest } from '@jest/globals';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { createInternalAuthAssertion } from '@core/auth-assertion';
import { GraphqlAccessGuard } from './graphql-access.guard.js';
import { InternalAuthService } from '../service/internal-auth.service.js';
import { SCOPES_KEY } from '../decorator/scopes.decorator.js';

describe('GraphqlAccessGuard central auth boundary', () => {
  const secret = 'a'.repeat(64);
  afterEach(() => jest.restoreAllMocks());
  const context = (req: any) => {
    const execution = { getHandler: () => ({}), getClass: () => ({}) } as any;
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({ getContext: () => ({ req }) } as any);
    return execution;
  };
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as any;
  const service = new InternalAuthService({ secret, issuer: 'gaegaeting-gateway', audience: 'match' });

  test.each([
    { headers: { 'x-jwt-payload': '{"userId":"forged"}' } },
    { headers: { authorization: 'Bearer local-jwt' } },
    { headers: {}, query: { excludeAuth: 'true' } },
  ])('rejects unsigned and local JWT inputs', async (req) => {
    await expect(new GraphqlAccessGuard(service, reflector).canActivate(context(req)))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  test('accepts an assertion bound to the GraphQL subgraph', async () => {
    const assertion = createInternalAuthAssertion({
      tenantId: 'tenant-a', subject: 'subject-a',
      userId: '01J00000000000000000000000', scopes: ['profile'],
    }, { secret, issuer: 'gaegaeting-gateway', audience: 'match' });
    const req: any = { headers: { 'x-gaegaeting-principal': assertion } };
    await expect(new GraphqlAccessGuard(service, reflector).canActivate(context(req))).resolves.toBe(true);
    expect(req.user).toMatchObject({ subject: 'subject-a', userId: '01J00000000000000000000000' });
  });

  test('accepts a principal containing every required scope', async () => {
    const assertion = createInternalAuthAssertion({
      tenantId: 'tenant-a', subject: 'subject-a',
      userId: '01J00000000000000000000000',
      scopes: ['match:read', 'match:write'],
    }, { secret, issuer: 'gaegaeting-gateway', audience: 'match' });
    const scopedReflector = {
      getAllAndOverride: jest.fn((key: string) =>
        key === SCOPES_KEY ? ['match:read', 'match:write'] : undefined),
    } as any;

    await expect(new GraphqlAccessGuard(service, scopedReflector).canActivate(context({
      headers: { 'x-gaegaeting-principal': assertion },
    }))).resolves.toBe(true);
  });

  test('rejects an empty granted scope list as forbidden', async () => {
    const assertion = createInternalAuthAssertion({
      tenantId: 'tenant-a', subject: 'subject-a',
      userId: '01J00000000000000000000000', scopes: [],
    }, { secret, issuer: 'gaegaeting-gateway', audience: 'match' });
    const scopedReflector = {
      getAllAndOverride: jest.fn((key: string) =>
        key === SCOPES_KEY ? ['match:read'] : undefined),
    } as any;

    await expect(new GraphqlAccessGuard(service, scopedReflector).canActivate(context({
      headers: { 'x-gaegaeting-principal': assertion },
    }))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
