import { jest } from '@jest/globals';
import { AuthServiceAccountProvisioningAdapter } from '../../src/user/infrastructure/adapter/outbound/auth/auth-service-account-provisioning.adapter.js';

describe('Auth user provisioning', () => {
  test('uses a dedicated service token and forwards only credential fields', async () => {
    const config = { getOrThrow: (key: string) => ({
      AUTH_BASE_URL: 'https://auth.example.test', AUTH_TENANT_CODE: 'gaegaeting',
      AUTH_PROVISIONING_CLIENT_ID: 'gaegaeting-account-provisioner',
      AUTH_PROVISIONING_CLIENT_SECRET: 'service-secret',
    } as Record<string, string>)[key] };
    const requests: Array<{ url: string; options: RequestInit }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn(async (url: string | URL | Request, options?: RequestInit) => {
      requests.push({ url: String(url), options: options! });
      return requests.length === 1
        ? new Response(JSON.stringify({ access_token: 'service-token' }), { status: 200 })
        : new Response(JSON.stringify({ subject: 'subject-1' }), { status: 201 });
    }) as typeof fetch;
    try {
      const adapter = new AuthServiceAccountProvisioningAdapter(config as any);
      await expect(adapter.provision({
        username: 'alice', password: 'password123', idempotencyKey: 'a'.repeat(43),
      })).resolves.toEqual({ authSubject: 'subject-1' });
      expect(requests.map((request) => request.url)).toEqual([
        'https://auth.example.test/t/gaegaeting/oidc/token',
        'https://auth.example.test/t/gaegaeting/provisioning/users',
      ]);
      expect(requests[0]!.options.body?.toString()).toBe('grant_type=client_credentials&scope=auth.user.provision');
      expect(requests[1]!.options.body).toBe(JSON.stringify({ username: 'alice', password: 'password123' }));
      expect(requests[1]!.options.headers).toMatchObject({
        authorization: 'Bearer service-token', 'idempotency-key': 'a'.repeat(43),
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('does not silently bind a conflicting Auth username to another signup', async () => {
    const config = { getOrThrow: (key: string) => ({
      AUTH_BASE_URL: 'https://auth.example.test', AUTH_TENANT_CODE: 'gaegaeting',
      AUTH_PROVISIONING_CLIENT_ID: 'gaegaeting-account-provisioner',
      AUTH_PROVISIONING_CLIENT_SECRET: 's'.repeat(32),
    } as Record<string, string>)[key] };
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = jest.fn(async () => {
      calls += 1;
      return calls === 1
        ? new Response(JSON.stringify({ access_token: 'service-token' }), { status: 200 })
        : new Response(null, { status: 409 });
    }) as typeof fetch;
    try {
      const adapter = new AuthServiceAccountProvisioningAdapter(config as any);
      await expect(adapter.provision({
        username: 'alice', password: 'password123', idempotencyKey: 'a'.repeat(43),
      })).rejects.toThrow('AUTH_ACCOUNT_ALREADY_EXISTS');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
