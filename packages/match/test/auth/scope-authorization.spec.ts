import { FeedResolver } from '#app/feed/infrastructure/adapter/inbound/gql/feed.resolver';
import { LocationResolver } from '#app/location/infrastructure/adapter/inbound/gql/location.resolver';
import { LikeController } from '#app/like/infrastructure/adapter/inbound/http/like.controller';
import { PairController } from '#app/pair/infrastructure/adapter/inbound/http/pair.controller';

const SCOPES_KEY = 'scopes';

function handler(type: any, name: string): (...args: any[]) => any {
  return type.prototype[name];
}

describe('match operation scope policies', () => {
  test.each([
    [FeedResolver, 'getDailyFeed'],
    [LocationResolver, 'mainArea'],
    [LikeController, 'getLikeOutList'],
    [LikeController, 'getLikeInList'],
    [PairController, 'getPairList'],
  ])('%s.%s requires match:read', (type, name) => {
    expect(Reflect.getMetadata(SCOPES_KEY, handler(type, name))).toEqual([
      'match:read',
    ]);
  });

  test.each([
    [FeedResolver, 'createDailyFeed'],
    [FeedResolver, 'actionFeed'],
    [LocationResolver, 'setMainArea'],
    [LocationResolver, 'setCurrentLocation'],
    [LikeController, 'like'],
    [LikeController, 'unlike'],
    [PairController, 'unPair'],
    [PairController, 'reportPair'],
  ])('%s.%s requires match:write', (type, name) => {
    expect(Reflect.getMetadata(SCOPES_KEY, handler(type, name))).toEqual([
      'match:write',
    ]);
  });
});
