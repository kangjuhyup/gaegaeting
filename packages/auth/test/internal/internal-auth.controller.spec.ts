import { UnauthorizedException } from '@nestjs/common';
import { InternalAuthController } from '../../src/adapter/in/http/internal/internal-auth.controller';

describe('InternalAuthController', () => {
  const makeRes = () =>
    ({
      setHeader: jest.fn(),
    }) as any;

  test('Authorization 헤더가 없으면 200(ok: true) + x-jwt-payload 미설정', async () => {
    const tokenService = { verifyToken: jest.fn() };
    const controller = new InternalAuthController(tokenService as any);

    const req = { headers: {} } as any;
    const res = makeRes();

    await expect(controller.verify(req, res)).resolves.toEqual({ ok: true });
    expect(tokenService.verifyToken).not.toHaveBeenCalled();
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  test('Authorization 형식이 Bearer가 아니면 UnauthorizedException', async () => {
    const tokenService = { verifyToken: jest.fn() };
    const controller = new InternalAuthController(tokenService as any);

    const req = { headers: { authorization: 'Basic xxx' } } as any;
    const res = makeRes();

    await expect(controller.verify(req, res)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(tokenService.verifyToken).not.toHaveBeenCalled();
  });

  test('토큰 검증 실패(verifyToken=null)이면 UnauthorizedException', async () => {
    const tokenService = { verifyToken: jest.fn().mockResolvedValue(null) };
    const controller = new InternalAuthController(tokenService as any);

    const req = { headers: { authorization: 'Bearer token123' } } as any;
    const res = makeRes();

    await expect(controller.verify(req, res)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(tokenService.verifyToken).toHaveBeenCalledWith('token123');
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  test('토큰 검증 성공이면 x-jwt-payload(base64(JSON)) 헤더를 설정한다', async () => {
    const metadata = {
      userId: 'u1',
      tenantId: 't1',
      iat: 1,
      exp: 2,
      roles: ['USER'],
      permissions: ['user.read'],
    };
    const tokenService = { verifyToken: jest.fn().mockResolvedValue(metadata) };
    const controller = new InternalAuthController(tokenService as any);

    const req = { headers: { authorization: 'Bearer token123' } } as any;
    const res = makeRes();

    await expect(controller.verify(req, res)).resolves.toEqual({ ok: true });
    expect(tokenService.verifyToken).toHaveBeenCalledWith('token123');

    const expectedB64 = Buffer.from(JSON.stringify(metadata), 'utf8').toString('base64');
    expect(res.setHeader).toHaveBeenCalledWith('x-jwt-payload', expectedB64);
  });
});


