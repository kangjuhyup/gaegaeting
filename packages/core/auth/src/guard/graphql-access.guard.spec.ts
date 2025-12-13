import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { GraphqlAccessGuard } from './graphql-access.guard';

describe('GraphqlAccessGuard', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockGqlContext = (req: any) => {
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getContext: () => ({ req }),
    } as any);
  };

  const makeReflector = (opts?: { roles?: string[]; permissions?: string[] }) =>
    ({
      getAllAndOverride: jest.fn().mockImplementation((key: string) => {
        if (key === 'roles') return opts?.roles;
        if (key === 'permissions') return opts?.permissions;
        return undefined;
      }),
    }) as any;

  test('x-jwt-payload(JSON)가 있으면 jwt 검증 없이 req.user를 설정한다', async () => {
    const jwtService = { verifyAsync: jest.fn() };
    const configService = { get: jest.fn() };
    const guard = new GraphqlAccessGuard(jwtService as any, configService as any, makeReflector());

    const req: any = { headers: { 'x-jwt-payload': '{"userId":"u1","roles":["USER"]}' } };
    mockGqlContext(req);

    await expect(guard.canActivate({} as any)).resolves.toBe(true);
    expect(req.user).toEqual({ userId: 'u1', roles: ['USER'] });
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  test('x-jwt-payload(base64(JSON))가 있으면 req.user를 설정한다', async () => {
    const jwtService = { verifyAsync: jest.fn() };
    const configService = { get: jest.fn() };
    const guard = new GraphqlAccessGuard(jwtService as any, configService as any, makeReflector());

    const b64 = Buffer.from('{"userId":"u1","roles":["USER"]}', 'utf8').toString('base64');
    const req: any = { headers: { 'x-jwt-payload': b64 } };
    mockGqlContext(req);

    await expect(guard.canActivate({} as any)).resolves.toBe(true);
    expect(req.user).toEqual({ userId: 'u1', roles: ['USER'] });
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  test('x-jwt-payload가 없고 Authorization도 없으면 UnauthorizedException', async () => {
    const jwtService = { verifyAsync: jest.fn() };
    const configService = { get: jest.fn() };
    const guard = new GraphqlAccessGuard(jwtService as any, configService as any, makeReflector());

    const req: any = { headers: {} };
    mockGqlContext(req);

    await expect(guard.canActivate({} as any)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  test('Authorization이 있으면 jwtService.verifyAsync로 검증하고 req.user를 설정한다', async () => {
    const jwtService = { verifyAsync: jest.fn().mockResolvedValue({ sub: 'u1' }) };
    const configService = { get: jest.fn().mockReturnValue('secret') };
    const guard = new GraphqlAccessGuard(jwtService as any, configService as any, makeReflector());

    const req: any = { headers: { authorization: 'Bearer token123' } };
    mockGqlContext(req);

    await expect(guard.canActivate({} as any)).resolves.toBe(true);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('token123', { secret: 'secret' });
    expect(req.user).toEqual({ sub: 'u1' });
  });

  test('jwtService.verifyAsync가 실패하면 UnauthorizedException', async () => {
    const jwtService = { verifyAsync: jest.fn().mockRejectedValue(new Error('bad token')) };
    const configService = { get: jest.fn().mockReturnValue('secret') };
    const guard = new GraphqlAccessGuard(jwtService as any, configService as any, makeReflector());

    const req: any = { headers: { authorization: 'Bearer token123' } };
    mockGqlContext(req);

    await expect(guard.canActivate({} as any)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  test('@Roles가 걸려있고 principal.roles가 부족하면 ForbiddenException', async () => {
    const jwtService = { verifyAsync: jest.fn() };
    const configService = { get: jest.fn() };
    const guard = new GraphqlAccessGuard(jwtService as any, configService as any, makeReflector({ roles: ['ADMIN'] }));

    const req: any = { headers: { 'x-jwt-payload': '{"userId":"u1","roles":["USER"]}' } };
    mockGqlContext(req);

    await expect(guard.canActivate({} as any)).rejects.toBeInstanceOf(ForbiddenException);
  });
});


