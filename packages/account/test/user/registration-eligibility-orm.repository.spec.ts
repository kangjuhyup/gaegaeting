import { GoneException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { RegistrationEligibilityOrmRepository } from '../../src/user/infrastructure/adapter/outbound/persistence/registration-eligibility-orm.repository.js';

describe('RegistrationEligibilityOrmRepository', () => {
  test('동일 attempt의 claim 재시도는 이미 USED여도 기존 claim 응답을 반환한다', async () => {
    const claimedUntil = new Date('2026-09-08T00:01:00.000Z');
    const row = {
      id: 'registration-1',
      tenantId: 'tenant-a',
      clientId: 'client-a',
      status: 'USED',
      attemptId: 'attempt-a',
      claimedUntil,
    };
    const transactionalEntityManager = { findOne: jest.fn().mockResolvedValue(row) };
    const entityManager = {
      transactional: jest.fn((work: (em: typeof transactionalEntityManager) => unknown) => work(transactionalEntityManager)),
    };
    const repository = new RegistrationEligibilityOrmRepository(entityManager as never);

    await expect(repository.claim({
      handoffDigest: 'digest',
      tenantId: 'tenant-a',
      clientId: 'client-a',
      attemptId: 'attempt-a',
      now: new Date('2026-09-08T00:02:00.000Z'),
      claimedUntil: new Date('2026-09-08T00:07:00.000Z'),
    })).resolves.toEqual({
      registrationId: 'registration-1',
      attemptId: 'attempt-a',
      claimedUntil,
    });
  });

  test('동일 attempt의 claim 재시도라도 lease가 만료되면 410을 반환한다', async () => {
    const row = {
      id: 'registration-1',
      tenantId: 'tenant-a',
      clientId: 'client-a',
      status: 'CLAIMED',
      attemptId: 'attempt-a',
      claimedUntil: new Date('2026-09-08T00:01:00.000Z'),
    };
    const transactionalEntityManager = { findOne: jest.fn().mockResolvedValue(row) };
    const entityManager = {
      transactional: jest.fn((work: (em: typeof transactionalEntityManager) => unknown) => work(transactionalEntityManager)),
    };
    const repository = new RegistrationEligibilityOrmRepository(entityManager as never);

    await expect(repository.claim({
      handoffDigest: 'digest',
      tenantId: 'tenant-a',
      clientId: 'client-a',
      attemptId: 'attempt-a',
      now: new Date('2026-09-08T00:01:00.000Z'),
      claimedUntil: new Date('2026-09-08T00:06:00.000Z'),
    })).rejects.toBeInstanceOf(GoneException);
  });
});
