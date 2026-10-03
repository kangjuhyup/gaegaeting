import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UserPrincipal } from '@core/auth';
import { createInternalAuthAssertion } from '@core/auth-assertion';
import { MatchPairsPort } from '../../application/port/match-pairs.port.js';
import { validatePair } from '../../application/service/room.service.js';

@Injectable()
export class MatchPairsClient extends MatchPairsPort {
  constructor(private readonly config: ConfigService) { super(); }
  async activePairs(principal: UserPrincipal) {
    try {
      const assertion = createInternalAuthAssertion(principal, {
        secret: this.config.getOrThrow('INTERNAL_AUTH_ASSERTION_SECRET'),
        issuer: 'gaegaeting-gateway', audience: 'match', ttlSeconds: 30,
      });
      const endpoint = new URL('/match/graphql', this.config.getOrThrow<string>('MATCH_SERVICE_HOST'));
      const response = await fetch(endpoint, { method: 'POST',
        headers: { 'content-type': 'application/json', 'x-gaegaeting-principal': assertion },
        body: JSON.stringify({ query: 'query ChatMatches { chatPairs { pairId leftUserId rightUserId } }' }),
        redirect: 'error', signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('Match unavailable');
      const body = await response.json() as { data?: { chatPairs?: unknown[] }; errors?: unknown[] };
      if (body.errors?.length || !Array.isArray(body.data?.chatPairs)) throw new Error('Invalid response');
      return body.data.chatPairs.map(validatePair);
    } catch { throw new ServiceUnavailableException('매칭 상태를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.'); }
  }
}
