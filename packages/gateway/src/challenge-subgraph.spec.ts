import { getSubgraphServices } from './subgraph-services.js';

describe('독립 챌린지 서비스 연결', () => {
  it('설정 전에는 기존 서비스만 구성한다', () => {
    expect(getSubgraphServices({}).map(service => service.name)).toEqual(['account', 'match']);
  });
  it('설정된 챌린지 서비스를 별도 audience의 서브그래프로 추가한다', () => {
    expect(getSubgraphServices({ CHALLENGE_SERVICE_URL: 'http://challenge:2803/challenge/graphql' })).toContainEqual({
      name: 'challenge', url: 'http://challenge:2803/challenge/graphql',
    });
  });
});
