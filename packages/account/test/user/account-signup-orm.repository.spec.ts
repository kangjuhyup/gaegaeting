import { jest } from '@jest/globals';
import { AccountSignupOrmRepository } from '../../src/user/infrastructure/adapter/outbound/persistence/account-signup-orm.repository.js';

describe('Saved signup identity', () => {
  const identity = { name: '가입 이름', birthDate: new Date('1996-05-14T00:00:00Z'), gender: 'FEMALE' as const, phone: '01012345678' };
  const reservation = { diDigest: 'd'.repeat(64), username: 'alice', issuer: 'issuer', termsVersion: 'v1', identity };

  test('signup stores personal information before provisioning and retries preserve it', async () => {
    let row: any = null;
    const em: any = {
      findOne: jest.fn(async () => row),
      create: jest.fn((_entity: unknown, value: unknown) => value),
      persist: jest.fn((value: unknown) => { row = value; }),
      flush: jest.fn(async () => {}),
      transactional: jest.fn(async (work: (em: any) => unknown) => work(em)),
    };
    const repository = new AccountSignupOrmRepository(em);
    await repository.reserve(reservation);
    expect(row).toMatchObject({ ...identity, status: 'PENDING' });
    await repository.reserve(reservation);
    expect(em.persist).toHaveBeenCalledTimes(1);
    await expect(repository.reserve({ ...reservation, identity: { ...identity, name: '다른 이름' } })).rejects.toThrow('cannot be changed');
    expect(row.name).toBe(identity.name);
  });

  test('identity lookup is scoped to the signed-in user and a completed signup', async () => {
    const em = { findOne: jest.fn(async () => ({ ...identity, status: 'COMPLETED' })) };
    const repository = new AccountSignupOrmRepository(em as any);
    await expect(repository.findIdentity('signed-in-user')).resolves.toEqual(identity);
    expect(em.findOne).toHaveBeenCalledWith(expect.anything(), { userId: 'signed-in-user', status: 'COMPLETED' });
  });

  test('missing legacy identity does not become an example name or date of birth', async () => {
    const em = { findOne: jest.fn(async () => ({ status: 'COMPLETED' })) };
    const repository = new AccountSignupOrmRepository(em as any);
    await expect(repository.findIdentity('legacy-user')).resolves.toBeNull();
  });
});
