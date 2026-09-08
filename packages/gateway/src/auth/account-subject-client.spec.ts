import { jest } from '@jest/globals';
import { AccountSubjectClient } from './account-subject-client.js';
import { AuthServiceUnavailableError } from './introspection-client.js';

describe('AccountSubjectClient', () => {
  test('returns the mapped application user ID', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user_id: '01J00000000000000000000000' }),
    });
    const client = new AccountSubjectClient(
      'http://account.app.svc.cluster.local/account/internal/subjects/resolve',
      fetchImpl as any,
      2_000,
    );

    await expect(
      client.resolve({ tenantId: 'tenant-gaegaeting', subject: 'central-subject' }),
    ).resolves.toEqual({ userId: '01J00000000000000000000000' });
    expect(fetchImpl.mock.calls[0][1].headers).toEqual({
      'content-type': 'application/json',
    });
  });

  test.each([
    { ok: false, status: 500, json: async () => ({}) },
    { ok: true, status: 200, json: async () => ({ user_id: '' }) },
  ])('classifies invalid account responses as unavailable', async (response) => {
    const client = new AccountSubjectClient(
      'http://account.app.svc.cluster.local/account/internal/subjects/resolve',
      jest.fn().mockResolvedValue(response) as any,
      2_000,
    );
    await expect(
      client.resolve({ tenantId: 'tenant-gaegaeting', subject: 'central-subject' }),
    ).rejects.toBeInstanceOf(AuthServiceUnavailableError);
  });
});
