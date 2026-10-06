import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { MatchPairsClient } from '../src/room/infrastructure/api/match-pairs.client.js';
import type { UserPrincipal } from '@core/auth';

describe('채팅이 사용하는 활성 매칭 계약', () => {
  const fetchOriginal = globalThis.fetch;
  const pair = { pairId: 1, leftUserId: '01ARZ3NDEKTSV4RRFFQ69G5FAV', rightUserId: '01ARZ3NDEKTSV4RRFFQ69G5FAW' };
  const principal = { userId: pair.leftUserId, tenantId: 'chat-qa', subject: 'subject-a',
    scopes: ['match:read'], issuedAt: 1, expiresAt: Math.floor(Date.now() / 1000) + 3600 } as UserPrincipal;
  const client = new MatchPairsClient(new ConfigService({ MATCH_SERVICE_HOST: 'http://127.0.0.1:2801',
    INTERNAL_AUTH_ASSERTION_SECRET: 'chat-qa-internal-secret-at-least-32-characters' }));
  afterEach(() => { globalThis.fetch = fetchOriginal; });
  it('인증된 GraphQL query로 활성 매칭을 조회하고 사용자 ID를 입력으로 보내지 않는다', async () => {
    const mock = jest.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ data: { chatPairs: [pair] } })));
    globalThis.fetch = mock;
    expect(await client.activePairs(principal)).toEqual([pair]);
    const [url, init] = mock.mock.calls[0];
    expect(String(url)).toBe('http://127.0.0.1:2801/match/graphql');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ query: 'query ChatMatches { chatPairs { pairId leftUserId rightUserId } }' });
    expect((init?.headers as Record<string, string>)['x-gaegaeting-principal']).toBeTruthy();
  });
  it.each([
    { errors: [{ message: 'private database failure' }] },
    { data: { chatPairs: [{ ...pair, rightUserId: pair.leftUserId }] } },
    { data: { chatPairs: null } },
  ])('조회 실패나 잘못된 매칭 응답은 빈 매칭으로 처리하지 않고 안전하게 거절한다: %j', async response => {
    globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(response)));
    await expect(client.activePairs(principal)).rejects.toThrow('매칭 상태를 확인할 수 없습니다.');
  });
});
