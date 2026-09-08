import type { FetchLike } from './oidc-discovery.js';
import { AuthServiceUnavailableError } from './introspection-client.js';

export class AccountSubjectClient {
  constructor(
    private readonly endpoint: string,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 2_000,
  ) {}

  async resolve(input: {
    tenantId: string;
    subject: string;
  }): Promise<{ userId: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tenant_id: input.tenantId, sub: input.subject }),
        signal: controller.signal,
      });
      if (!response.ok) throw new AuthServiceUnavailableError();
      const body = (await response.json()) as Record<string, unknown> | null;
      if (typeof body?.user_id !== 'string' || body.user_id.trim() === '') {
        throw new AuthServiceUnavailableError();
      }
      return { userId: body.user_id };
    } catch {
      throw new AuthServiceUnavailableError();
    } finally {
      clearTimeout(timeout);
    }
  }
}
