import { jest } from '@jest/globals';
import { createEdgeAssertion, EDGE_ASSERTION_HEADER } from './edge-assertion.js';
import { createEdgeAuthenticationMiddleware } from './edge-authentication-middleware.js';

const secret = 'edge-only-test-secret-that-is-long-enough';
const principal = {
  issuer: 'https://auth.example/t/gaegaeting/oidc',
  tenantId: 'tenant-gaegaeting', subject: 'auth-subject', scopes: ['match:read'],
  issuedAt: 1, expiresAt: Math.floor(Date.now() / 1000) + 300,
};

function recorder() {
  return {
    statusCode: 200, body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}

describe('Gateway edge authentication', () => {
  test('maps validated Auth subject through Account, then strips untrusted headers', async () => {
    const subjects = { resolve: jest.fn().mockResolvedValue({ userId: 'account-user' }) };
    const request: any = { headers: {
      authorization: 'Bearer opaque-token',
      [EDGE_ASSERTION_HEADER]: createEdgeAssertion(principal, 'opaque-token', secret),
      'x-gaegaeting-principal': 'forged',
    } };
    const next = jest.fn();
    await createEdgeAuthenticationMiddleware(subjects as any, secret)(request, recorder() as any, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(request.authenticatedPrincipal).toEqual({
      tenantId: principal.tenantId, subject: principal.subject,
      userId: 'account-user', scopes: principal.scopes,
    });
    expect(subjects.resolve).toHaveBeenCalledWith({
      tenantId: principal.issuer,
      subject: principal.subject,
    });
    expect(request.headers.authorization).toBeUndefined();
    expect(request.headers[EDGE_ASSERTION_HEADER]).toBeUndefined();
    expect(request.headers['x-gaegaeting-principal']).toBeUndefined();
  });

  test.each([
    ['missing assertion', undefined, 'opaque-token'],
    ['forged assertion', 'forged', 'opaque-token'],
    ['wrong token', createEdgeAssertion(principal, 'opaque-token', secret), 'other-token'],
  ])('rejects %s before Account lookup', async (_reason, assertion, token) => {
    const subjects = { resolve: jest.fn() };
    const response = recorder();
    const request: any = { headers: {
      authorization: `Bearer ${token}`, [EDGE_ASSERTION_HEADER]: assertion,
    } };
    await createEdgeAuthenticationMiddleware(subjects as any, secret)(request, response as any, jest.fn());
    expect(response.statusCode).toBe(401);
    expect(subjects.resolve).not.toHaveBeenCalled();
  });

  test('fails closed when Account subject mapping is unavailable', async () => {
    const subjects = { resolve: jest.fn().mockRejectedValue(new Error('unavailable')) };
    const response = recorder();
    const request: any = { headers: {
      authorization: 'Bearer opaque-token',
      [EDGE_ASSERTION_HEADER]: createEdgeAssertion(principal, 'opaque-token', secret),
    } };
    await createEdgeAuthenticationMiddleware(subjects as any, secret)(request, response as any, jest.fn());
    expect(response.statusCode).toBe(503);
  });
});
