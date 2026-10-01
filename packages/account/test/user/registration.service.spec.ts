import { jest } from '@jest/globals';
import { RegistrationService } from '#app/user/application/service/registration.service';

describe('RegistrationService', () => {
  const now = new Date('2026-09-08T00:00:00.000Z');

  function harness() {
    const repository = {
      issue: jest.fn(async (record: any) => record),
      claim: jest.fn(async (input: any) => ({
        registrationId: 'registration-1',
        attemptId: input.attemptId,
        claimedUntil: new Date(now.getTime() + 300_000),
      })),
      complete: jest.fn(async (input: any) => ({ registrationId: input.registrationId, status: 'USED' as const })),
    };
    const verifier = { verify: jest.fn(async (input: any) => input) };
    const service = new RegistrationService(repository as any, verifier as any, {
      diHmacSecret: 'd'.repeat(32),
      diHmacKeyVersion: 1,
      handoffTtlMs: 10 * 60_000,
      claimTtlMs: 5 * 60_000,
      now: () => now,
      randomHandoffId: () => 'opaque-handoff-id',
      randomId: () => 'registration-1',
      randomUserId: () => '01J11111111111111111111111',
    });
    return { service, repository, verifier };
  }

  test('CI와 DI 원문을 저장하지 않고 DI HMAC과 handoff digest만 저장한다', async () => {
    const { service, repository } = harness();

    await expect(service.completeMockVerification({
      providerTransactionId: 'mock-tx-1',
      ci: 'raw-ci-must-not-be-stored',
      di: 'raw-di-must-not-be-stored',
      adult: true,
      tenantId: 'tenant-a',
      clientId: 'client-a',
      termsVersion: '2026-09-01',
      termsAgreed: true,
    })).resolves.toEqual({ handoffId: 'opaque-handoff-id', expiresAt: new Date(now.getTime() + 600_000) });

    const persisted = repository.issue.mock.calls[0]![0] as Record<string, unknown>;
    expect(persisted).not.toHaveProperty('ci');
    expect(persisted).not.toHaveProperty('di');
    expect(JSON.stringify(persisted)).not.toContain('raw-ci-must-not-be-stored');
    expect(JSON.stringify(persisted)).not.toContain('raw-di-must-not-be-stored');
    expect(persisted.diDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(persisted.handoffDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(persisted.diKeyVersion).toBe(1);
  });

  test('성인 확인과 약관 동의가 없으면 handoff를 발급하지 않는다', async () => {
    const { service, repository } = harness();
    await expect(service.completeMockVerification({
      providerTransactionId: 'mock-tx-2', ci: 'ci', di: 'di', adult: false,
      tenantId: 'tenant-a', clientId: 'client-a', termsVersion: 'v1', termsAgreed: true,
    })).rejects.toThrow('Adult verification is required');
    await expect(service.completeMockVerification({
      providerTransactionId: 'mock-tx-3', ci: 'ci', di: 'di', adult: true,
      tenantId: 'tenant-a', clientId: 'client-a', termsVersion: 'v1', termsAgreed: false,
    })).rejects.toThrow('Terms agreement is required');
    expect(repository.issue).not.toHaveBeenCalled();
  });

  test('동일 DI 또는 인증 거래의 중복 발급을 충돌로 변환한다', async () => {
    const { service, repository } = harness();
    repository.issue.mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: '23505' }));
    await expect(service.completeMockVerification({
      providerTransactionId: 'mock-tx-duplicate', ci: 'ci', di: 'di', adult: true,
      tenantId: 'tenant-a', clientId: 'client-a', termsVersion: 'v1', termsAgreed: true,
    })).rejects.toThrow('Identity is already registered or verification was already used');
  });

  test('claim 요청은 handoff 원문 대신 digest와 서버 바인딩을 repository에 전달한다', async () => {
    const { service, repository } = harness();
    await service.claim({ handoffId: 'opaque-handoff-id', tenantId: 'tenant-a', clientId: 'client-a', attemptId: 'attempt-a' });
    expect(repository.claim).toHaveBeenCalledWith(expect.objectContaining({
      handoffDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
      tenantId: 'tenant-a', clientId: 'client-a', attemptId: 'attempt-a',
      now, claimedUntil: new Date(now.getTime() + 300_000),
    }));
    expect(repository.claim.mock.calls[0]![0]).not.toHaveProperty('handoffId');
  });

  test('complete는 issuer와 subject를 동일 attempt에 멱등 연결한다', async () => {
    const { service, repository } = harness();
    await expect(service.complete({ registrationId: 'registration-1', attemptId: 'attempt-a', issuer: 'https://auth.example', subject: 'auth-sub' }))
      .resolves.toEqual({ registrationId: 'registration-1', status: 'USED' });
    expect(repository.complete).toHaveBeenCalledWith({
      registrationId: 'registration-1', attemptId: 'attempt-a', issuer: 'https://auth.example', subject: 'auth-sub', now,
    });
  });
});
