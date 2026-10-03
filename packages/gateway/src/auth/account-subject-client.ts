import type { FetchLike } from './oidc-discovery.js';
import { AuthServiceUnavailableError } from './introspection-client.js';
import { getTraceId, TRACE_ID_HEADER } from '@core/util/trace';

export class AccountSubjectNotLinkedError extends Error {}

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
    const traceId = getTraceId();
    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(traceId ? { [TRACE_ID_HEADER]: traceId } : {}),
        },
        body: JSON.stringify({ tenant_id: input.tenantId, sub: input.subject }),
        signal: controller.signal,
      });
      if (response.status === 404) throw new AccountSubjectNotLinkedError();
      if (!response.ok) throw new AuthServiceUnavailableError();
      const body = (await response.json()) as Record<string, unknown> | null;
      if (typeof body?.user_id !== 'string' || body.user_id.trim() === '') {
        throw new AuthServiceUnavailableError();
      }
      return { userId: body.user_id };
    } catch (error) {
      if (error instanceof AccountSubjectNotLinkedError) throw error;
      throw new AuthServiceUnavailableError();
    } finally {
      clearTimeout(timeout);
    }
  }
}
