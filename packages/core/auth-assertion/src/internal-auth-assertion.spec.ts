import {
  createInternalAuthAssertion,
  verifyInternalAuthAssertion,
} from './internal-auth-assertion.js';

const secret = 'a'.repeat(64);
const now = 1_800_000_000;

describe('internal auth assertion', () => {
  const principal = {
    tenantId: 'tenant-gaegaeting',
    subject: 'central-subject',
    userId: '01J00000000000000000000000',
    scopes: ['openid', 'profile'],
  };

  test('round trips a valid audience-bound principal', () => {
    const assertion = createInternalAuthAssertion(principal, {
      secret,
      issuer: 'gaegaeting-gateway',
      audience: 'account',
      ttlSeconds: 30,
      now: () => now,
    });

    expect(
      verifyInternalAuthAssertion(assertion, {
        secret,
        issuer: 'gaegaeting-gateway',
        audience: 'account',
        now: () => now + 1,
      }),
    ).toEqual({ ...principal, issuedAt: now, expiresAt: now + 30 });
  });

  test.each([
    ['wrong issuer', { issuer: 'another-gateway', audience: 'account' }],
    ['wrong audience', { issuer: 'gaegaeting-gateway', audience: 'match' }],
  ])('rejects %s', (_label, override) => {
    const assertion = createInternalAuthAssertion(principal, {
      secret,
      issuer: 'gaegaeting-gateway',
      audience: 'account',
      ttlSeconds: 30,
      now: () => now,
    });

    expect(() =>
      verifyInternalAuthAssertion(assertion, {
        secret,
        ...override,
        now: () => now + 1,
      }),
    ).toThrow('Invalid internal authentication assertion');
  });

  test('rejects a modified payload with its original signature', () => {
    const assertion = createInternalAuthAssertion(principal, {
      secret,
      issuer: 'gaegaeting-gateway',
      audience: 'account',
      ttlSeconds: 30,
      now: () => now,
    });
    const [payload, signature] = assertion.split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    decoded.user_id = '01J99999999999999999999999';
    const altered = `${Buffer.from(JSON.stringify(decoded)).toString('base64url')}.${signature}`;

    expect(() =>
      verifyInternalAuthAssertion(altered, {
        secret,
        issuer: 'gaegaeting-gateway',
        audience: 'account',
        now: () => now + 1,
      }),
    ).toThrow('Invalid internal authentication assertion');
  });

  test.each([
    ['expired', now + 31],
    ['not active yet', now - 1],
  ])('rejects an assertion that is %s', (_label, verificationTime) => {
    const assertion = createInternalAuthAssertion(principal, {
      secret,
      issuer: 'gaegaeting-gateway',
      audience: 'account',
      ttlSeconds: 30,
      now: () => now,
    });

    expect(() =>
      verifyInternalAuthAssertion(assertion, {
        secret,
        issuer: 'gaegaeting-gateway',
        audience: 'account',
        now: () => verificationTime,
      }),
    ).toThrow('Invalid internal authentication assertion');
  });

  test.each(['tenantId', 'subject', 'userId'] as const)(
    'refuses to sign a principal without %s',
    (field) => {
      expect(() =>
        createInternalAuthAssertion({ ...principal, [field]: '' }, {
          secret,
          issuer: 'gaegaeting-gateway',
          audience: 'account',
          ttlSeconds: 30,
          now: () => now,
        }),
      ).toThrow('Invalid internal authentication assertion');
    },
  );

  test('refuses assertions longer than sixty seconds', () => {
    expect(() =>
      createInternalAuthAssertion(principal, {
        secret,
        issuer: 'gaegaeting-gateway',
        audience: 'account',
        ttlSeconds: 61,
        now: () => now,
      }),
    ).toThrow('Invalid internal authentication assertion');
  });
});
