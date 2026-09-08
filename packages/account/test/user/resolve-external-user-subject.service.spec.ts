import { jest } from '@jest/globals';
import { ResolveExternalUserSubjectService } from '../../src/user/application/service/resolve-external-user-subject.service.js';

describe('ResolveExternalUserSubjectService', () => {
  function harness() {
    const rows = new Map<string, string>();
    const repository = {
      findUserId: jest.fn(async (tenantId: string, subject: string) =>
        rows.get(`${tenantId}\0${subject}`) ?? null,
      ),
      insert: jest.fn(async (mapping: any) => {
        const key = `${mapping.tenantId}\0${mapping.subject}`;
        if (rows.has(key)) throw Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' });
        rows.set(key, mapping.userId);
      }),
    };
    return { service: new ResolveExternalUserSubjectService(repository as any), rows };
  }

  test('repeated resolution returns the same application user ID', async () => {
    const { service } = harness();
    const first = await service.resolve('tenant-a', 'subject-a');
    const second = await service.resolve('tenant-a', 'subject-a');
    expect(second).toBe(first);
    expect(first).toHaveLength(26);
    expect(first).not.toBe('subject-a');
  });

  test('the same subject in another tenant receives a separate mapping', async () => {
    const { service } = harness();
    const first = await service.resolve('tenant-a', 'same-subject');
    const second = await service.resolve('tenant-b', 'same-subject');
    expect(second).not.toBe(first);
  });

  test.each([
    ['', 'subject-a'],
    ['tenant-a', ''],
    ['  ', 'subject-a'],
  ])('rejects blank external identifiers', async (tenantId, subject) => {
    const { service } = harness();
    await expect(service.resolve(tenantId, subject)).rejects.toThrow(
      'Invalid external subject',
    );
  });

  test('recovers the winning mapping after a duplicate-key race', async () => {
    const winner = '01J11111111111111111111111';
    const repository = {
      findUserId: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(winner),
      insert: jest.fn().mockRejectedValue(Object.assign(new Error('duplicate'), { code: '23505' })),
    };
    const service = new ResolveExternalUserSubjectService(repository as any);
    await expect(service.resolve('tenant-a', 'subject-a')).resolves.toBe(winner);
  });
});
