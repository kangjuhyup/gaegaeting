import { createEdgeAssertion, verifyEdgeAssertion } from './edge-assertion.js';

const secret = 'edge-only-test-secret-that-is-long-enough';
const principal = {
  issuer: 'https://auth.example/t/gaegaeting/oidc',
  tenantId: 'tenant-gaegaeting',
  subject: 'auth-subject',
  scopes: ['account:read', 'match:write'],
  issuedAt: 90,
  expiresAt: 200,
};

describe('edge authentication assertion', () => {
  test('accepts only the matching bearer token and returns Auth identity, not Account identity', () => {
    const assertion = createEdgeAssertion(principal, 'opaque-token', secret, 100);
    expect(verifyEdgeAssertion(assertion, 'opaque-token', secret, 110)).toEqual({
      issuer: principal.issuer,
      tenantId: 'tenant-gaegaeting',
      subject: 'auth-subject',
      scopes: ['account:read', 'match:write'],
    });
    expect(assertion).not.toContain('opaque-token');
  });

  test.each([
    ['different bearer token', 'other-token', 110, secret],
    ['expired assertion', 'opaque-token', 130, secret],
    ['wrong edge secret', 'opaque-token', 110, 'different-edge-test-secret-long-enough'],
  ])('rejects %s', (_reason, token, now, verificationSecret) => {
    const assertion = createEdgeAssertion(principal, 'opaque-token', secret, 100);
    expect(() => verifyEdgeAssertion(assertion, token, verificationSecret, now)).toThrow(
      'Invalid edge authentication assertion',
    );
  });

  test('never extends the Auth token expiration', () => {
    const assertion = createEdgeAssertion({ ...principal, expiresAt: 105 }, 'opaque-token', secret, 100);
    expect(() => verifyEdgeAssertion(assertion, 'opaque-token', secret, 105)).toThrow();
  });
});
