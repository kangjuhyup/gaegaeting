import { jest } from '@jest/globals';
import { RegistrationServiceGuard } from '#app/user/infrastructure/adapter/inbound/http/registration/registration-service.guard';

describe('RegistrationServiceGuard', () => {
  const token = 's'.repeat(32);
  const config = { getOrThrow: jest.fn(() => token) } as any;
  const context = (authorization?: string) => ({
    switchToHttp: () => ({ getRequest: () => ({ headers: { authorization } }) }),
  }) as any;

  test('accepts only the dedicated bearer credential', () => {
    const guard = new RegistrationServiceGuard(config);
    expect(guard.canActivate(context(`Bearer ${token}`))).toBe(true);
    expect(() => guard.canActivate(context('Bearer invalid'))).toThrow('Invalid registration service credential');
    expect(() => guard.canActivate(context())).toThrow('Invalid registration service credential');
  });
});
