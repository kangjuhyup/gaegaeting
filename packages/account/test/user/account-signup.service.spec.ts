import { jest } from '@jest/globals';
import { AccountSignupService } from '../../src/user/application/service/account-signup.service.js';

describe('Account signup', () => {
  const input = {
    providerTransactionId: 'mock-tx-1', ci: 'private-ci', di: 'private-di', adult: true,
    termsVersion: '2026-09-01', termsAgreed: true, username: 'alice', password: 'password123',
    email: 'alice@example.com', phone: '01012345678',
  };

  test('verified signup sends only credentials and a stable opaque key to Auth', async () => {
    const verifier = { verify: jest.fn(async (value: typeof input) => value) };
    const authAccounts = { provision: jest.fn(async () => ({ authSubject: 'auth-subject' })) };
    const signups = {
      reserve: jest.fn(async () => ({ userId: 'user-1', username: 'alice', issuer: 'http://localhost:3010/t/gaegaeting/oidc' })),
      complete: jest.fn(async () => ({ userId: 'user-1', username: 'alice', issuer: 'http://localhost:3010/t/gaegaeting/oidc', authSubject: 'auth-subject' })),
    };
    const service = new AccountSignupService(verifier as any, authAccounts as any, signups as any, {
      diHmacSecret: 's'.repeat(32), diHmacKeyVersion: 1, handoffTtlMs: 600000, claimTtlMs: 300000,
      authIssuer: 'http://localhost:3010/t/gaegaeting/oidc',
    });

    await expect(service.register(input)).resolves.toEqual({ authSubject: 'auth-subject' });
    await service.register(input);
    expect(authAccounts.provision).toHaveBeenCalledTimes(2);
    const first = authAccounts.provision.mock.calls[0]![0] as Record<string, unknown>;
    expect(first).toEqual({
      username: 'alice', password: 'password123',
      idempotencyKey: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
    });
    expect(authAccounts.provision.mock.calls[1]![0]).toEqual(first);
    expect(signups.reserve).toHaveBeenCalledTimes(2);
    expect(signups.complete).toHaveBeenCalledWith({ diDigest: expect.stringMatching(/^[a-f0-9]{64}$/), subject: 'auth-subject' });
    expect(JSON.stringify(first)).not.toContain('private-di');
    expect(JSON.stringify(first)).not.toContain('alice@example.com');
  });

  test('completed signup returns the existing subject without creating another Auth user', async () => {
    const verifier = { verify: jest.fn(async (value: typeof input) => value) };
    const authAccounts = { provision: jest.fn(async () => ({ authSubject: 'unused' })) };
    const signups = { reserve: jest.fn(async () => ({ authSubject: 'existing-subject' })), complete: jest.fn() };
    const service = new AccountSignupService(verifier as any, authAccounts as any, signups as any, {
      diHmacSecret: 's'.repeat(32), diHmacKeyVersion: 1, handoffTtlMs: 600000, claimTtlMs: 300000,
      authIssuer: 'http://localhost:3010/t/gaegaeting/oidc',
    });
    await expect(service.register(input)).resolves.toEqual({ authSubject: 'existing-subject' });
    expect(authAccounts.provision).not.toHaveBeenCalled();
    expect(signups.complete).not.toHaveBeenCalled();
  });

  test('temporary provisioning failure can retry the same identity with the same Auth idempotency key', async () => {
    const verifier = { verify: jest.fn(async (value: typeof input) => value) };
    const authAccounts = { provision: jest.fn()
      .mockRejectedValueOnce(new Error('AUTH_PROVISIONING_UNAVAILABLE'))
      .mockResolvedValueOnce({ authSubject: 'new-subject' }) };
    const signups = {
      reserve: jest.fn(async () => ({ userId: 'user-1', username: 'alice', issuer: 'http://localhost:3010/t/gaegaeting/oidc' })),
      complete: jest.fn(async () => ({ authSubject: 'new-subject' })),
    };
    const service = new AccountSignupService(verifier as any, authAccounts as any, signups as any, {
      diHmacSecret: 's'.repeat(32), diHmacKeyVersion: 1, handoffTtlMs: 600000, claimTtlMs: 300000,
      authIssuer: 'http://localhost:3010/t/gaegaeting/oidc',
    });
    await expect(service.register(input)).rejects.toThrow('AUTH_PROVISIONING_UNAVAILABLE');
    await expect(service.register(input)).resolves.toEqual({ authSubject: 'new-subject' });
    expect(authAccounts.provision.mock.calls[1]?.[0]).toEqual(authAccounts.provision.mock.calls[0]?.[0]);
    expect(signups.complete).toHaveBeenCalledTimes(1);
  });
});
