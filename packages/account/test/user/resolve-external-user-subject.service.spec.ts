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

  test('registered subject resolves to its existing application user ID', async () => {
    const { service, rows } = harness();
    rows.set('tenant-a\0subject-a', '01J11111111111111111111111');
    const first = await service.resolve('tenant-a', 'subject-a');
    const second = await service.resolve('tenant-a', 'subject-a');
    expect(second).toBe(first);
    expect(first).toBe('01J11111111111111111111111');
    expect(first).not.toBe('subject-a');
  });

  test('the same subject in another tenant cannot borrow the registered mapping', async () => {
    const { service, rows } = harness();
    rows.set('tenant-a\0same-subject', '01J11111111111111111111111');
    const first = await service.resolve('tenant-a', 'same-subject');
    expect(first).toBe('01J11111111111111111111111');
    await expect(service.resolve('tenant-b', 'same-subject')).rejects.toThrow('Auth subject is not linked');
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

  test('unregistered Auth subject is rejected instead of creating an account during login', async () => {
    const { service, rows } = harness();
    await expect(service.resolve('tenant-a', 'subject-a')).rejects.toThrow('Auth subject is not linked');
    expect(rows.size).toBe(0);
  });
});
