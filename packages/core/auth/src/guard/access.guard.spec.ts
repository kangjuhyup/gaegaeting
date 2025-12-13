import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AccessGuard } from './access.guard';

describe('AccessGuard', () => {
  const makeContext = (req: any) =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as any;

  const makeReflector = (opts?: { roles?: string[]; permissions?: string[] }) =>
    ({
      getAllAndOverride: jest.fn().mockImplementation((key: string) => {
        if (key === 'roles') return opts?.roles;
        if (key === 'permissions') return opts?.permissions;
        return undefined;
      }),
    }) as any;

  test('excludeAuth=true이면 검증 없이 통과한다', async () => {
    const jwtTokenService = { verify: jest.fn() };
    const guard = new AccessGuard(jwtTokenService as any, makeReflector());

    const req = { query: { excludeAuth: 'true' }, headers: {} };
    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
    expect(jwtTokenService.verify).not.toHaveBeenCalled();
  });

  test('x-jwt-payload(JSON)가 있으면 이를 파싱해서 request.auth로 설정한다', async () => {
    const jwtTokenService = { verify: jest.fn() };
    const guard = new AccessGuard(jwtTokenService as any, makeReflector());

    const req: any = { query: {}, headers: { 'x-jwt-payload': '{"userId":"u1","roles":["USER"]}' } };
    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
    expect(req.auth).toEqual({ userId: 'u1', roles: ['USER'] });
    expect(jwtTokenService.verify).not.toHaveBeenCalled();
  });

  test('x-jwt-payload(base64(JSON))가 있으면 이를 파싱해서 request.auth로 설정한다', async () => {
    const jwtTokenService = { verify: jest.fn() };
    const guard = new AccessGuard(jwtTokenService as any, makeReflector());

    const b64 = Buffer.from('{"userId":"u1","roles":["USER"]}', 'utf8').toString('base64');
    const req: any = { query: {}, headers: { 'x-jwt-payload': b64 } };
    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
    expect(req.auth).toEqual({ userId: 'u1', roles: ['USER'] });
    expect(jwtTokenService.verify).not.toHaveBeenCalled();
  });

  test('x-jwt-payload가 파싱 불가능하면 UnauthorizedException', async () => {
    const jwtTokenService = { verify: jest.fn() };
    const guard = new AccessGuard(jwtTokenService as any, makeReflector());

    const req: any = { query: {}, headers: { 'x-jwt-payload': 'not-json-not-base64' } };
    await expect(guard.canActivate(makeContext(req))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  test('forward header가 없고 토큰도 없으면 UnauthorizedException', async () => {
    const jwtTokenService = { verify: jest.fn() };
    const guard = new AccessGuard(jwtTokenService as any, makeReflector());

    const req: any = { query: {}, headers: {}, cookies: {} };
    await expect(guard.canActivate(makeContext(req))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtTokenService.verify).not.toHaveBeenCalled();
  });

  test('Authorization Bearer 토큰이 있으면 jwtTokenService.verify로 검증하고 request.auth를 설정한다', async () => {
    const jwtTokenService = { verify: jest.fn().mockResolvedValue({ sub: 'u1' }) };
    const guard = new AccessGuard(jwtTokenService as any, makeReflector());

    const req: any = { query: {}, headers: { authorization: 'Bearer token123' }, cookies: {} };
    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
    expect(jwtTokenService.verify).toHaveBeenCalledWith('token123');
    expect(req.auth).toEqual({ sub: 'u1' });
  });

  test('@Roles가 걸려있고 principal.roles가 부족하면 ForbiddenException', async () => {
    const jwtTokenService = { verify: jest.fn() };
    const guard = new AccessGuard(jwtTokenService as any, makeReflector({ roles: ['ADMIN'] }));

    const req: any = { query: {}, headers: { 'x-jwt-payload': '{"userId":"u1","roles":["USER"]}' } };
    await expect(guard.canActivate(makeContext(req))).rejects.toBeInstanceOf(ForbiddenException);
  });

  test('@Permissions가 걸려있고 principal.permissions가 충족되면 통과', async () => {
    const jwtTokenService = { verify: jest.fn() };
    const guard = new AccessGuard(jwtTokenService as any, makeReflector({ permissions: ['user.read'] }));

    const req: any = {
      query: {},
      headers: { 'x-jwt-payload': '{"userId":"u1","permissions":["user.read"]}' },
    };
    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
  });
});


