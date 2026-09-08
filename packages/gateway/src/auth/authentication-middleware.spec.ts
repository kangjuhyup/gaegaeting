import { jest } from '@jest/globals';
import { createAuthenticationMiddleware } from './authentication-middleware.js';
import {
  AuthServiceUnavailableError,
  InactiveTokenError,
} from './introspection-client.js';

function responseRecorder() {
  const response: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return response;
}

describe('authentication middleware', () => {
  test.each([undefined, 'Basic abc', 'Bearer', 'Bearer one two'])(
    'rejects a missing or malformed bearer header and strips identity headers',
    async (authorization) => {
      const introspector = { introspect: jest.fn() };
      const subjects = { resolve: jest.fn() };
      const middleware = createAuthenticationMiddleware(introspector, subjects);
      const request: any = {
        headers: {
          authorization,
          'x-jwt-payload': 'forged',
          'x-gaegaeting-principal': 'forged',
        },
      };
      const response = responseRecorder();

      await middleware(request, response, jest.fn());

      expect(response.statusCode).toBe(401);
      expect(request.headers['x-jwt-payload']).toBeUndefined();
      expect(request.headers['x-gaegaeting-principal']).toBeUndefined();
    },
  );

  test.each([
    [new InactiveTokenError(), 401],
    [new AuthServiceUnavailableError(), 503],
  ])('maps authentication failures to the required status', async (error, status) => {
    const middleware = createAuthenticationMiddleware(
      { introspect: jest.fn().mockRejectedValue(error) },
      { resolve: jest.fn() },
    );
    const response = responseRecorder();
    await middleware(
      { headers: { authorization: 'Bearer opaque-value' } } as any,
      response,
      jest.fn(),
    );
    expect(response.statusCode).toBe(status);
    expect(JSON.stringify(response.body)).not.toContain('opaque-value');
  });

  test('stores only the mapped principal and continues', async () => {
    const request: any = {
      headers: { authorization: 'Bearer opaque-value' },
    };
    const next = jest.fn();
    const middleware = createAuthenticationMiddleware(
      {
        introspect: jest.fn().mockResolvedValue({
          tenantId: 'tenant-gaegaeting',
          subject: 'central-subject',
          scopes: ['openid'],
          issuedAt: 1,
          expiresAt: 2,
        }),
      },
      { resolve: jest.fn().mockResolvedValue({ userId: '01J00000000000000000000000' }) },
    );

    await middleware(request, responseRecorder(), next);

    expect(request.authenticatedPrincipal).toEqual({
      tenantId: 'tenant-gaegaeting',
      subject: 'central-subject',
      userId: '01J00000000000000000000000',
      scopes: ['openid'],
    });
    expect(next).toHaveBeenCalledTimes(1);
  });
});
