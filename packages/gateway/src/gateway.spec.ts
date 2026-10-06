import { describe, expect, test } from '@jest/globals';
import { getSubgraphServices } from './subgraph-services.js';

describe('Payment subgraph configuration', () => {
  test('Chat joins the configured services while Payment and Challenge remain composed', () => {
    expect(getSubgraphServices({
      CHAT_SERVICE_URL: 'http://chat:2804/chat/graphql',
      PAYMENT_SERVICE_URL: 'http://payment:2802/payment/graphql',
      CHALLENGE_SERVICE_URL: 'http://challenge:2803/challenge/graphql',
    }).map(service => service.name)).toEqual(['account', 'match', 'chat', 'payment', 'challenge']);
  });
  test('keeps existing installations on Account and Match until Payment is configured', () => {
    expect(getSubgraphServices({})).toEqual([
      { name: 'account', url: 'http://127.0.0.1:2800/account/graphql' },
      { name: 'match', url: 'http://127.0.0.1:2801/match/graphql' },
    ]);
    expect(getSubgraphServices({ PAYMENT_SERVICE_URL: ' ' })).toHaveLength(2);
  });

  test('composes configured Payment with its own assertion audience', () => {
    expect(getSubgraphServices({ PAYMENT_SERVICE_URL: 'http://payment:2802/payment/graphql' })).toContainEqual({
      name: 'payment', url: 'http://payment:2802/payment/graphql',
    });
  });
});
