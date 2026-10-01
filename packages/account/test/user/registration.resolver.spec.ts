import { jest } from '@jest/globals';
import { RegistrationResolver } from '../../src/user/infrastructure/adapter/inbound/gql/registration.resolver.js';

describe('RegistrationResolver', () => {
  test('모킹 본인인증 완료 결과에서 handoffId와 expiresAt만 반환한다', async () => {
    const expiresAt = new Date('2026-09-08T00:10:00.000Z');
    const registrations = {
      completeMockVerification: jest.fn().mockResolvedValue({
        handoffId: 'opaque-handoff-id',
        expiresAt,
      }),
    };
    const resolver = new RegistrationResolver(registrations as never);
    const input = {
      providerTransactionId: 'provider-transaction-1',
      ci: 'transient-ci',
      di: 'transient-di',
      adult: true,
      tenantId: 'tenant-a',
      clientId: 'client-a',
      termsVersion: '2026-09-08',
      termsAgreed: true,
    };

    await expect(resolver.completeMockIdentityVerification(input)).resolves.toEqual({
      handoffId: 'opaque-handoff-id',
      expiresAt,
    });
    expect(registrations.completeMockVerification).toHaveBeenCalledWith(input);
  });
});
