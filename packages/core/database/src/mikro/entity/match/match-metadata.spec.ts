import { ReflectMetadataProvider } from '@mikro-orm/decorators/legacy';
import { MikroORM, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { MIKRO_MATCH_ENTITIES } from '../../datasource/database-schema.js';

describe('MikroORM MATCH metadata', () => {
  it('discovers six tables with stable named indexes and relations', async () => {
    expect(MIKRO_MATCH_ENTITIES).toHaveLength(6);
    const orm = await MikroORM.init({
      driver: PostgreSqlDriver,
      dbName: 'metadata-only',
      entities: [...MIKRO_MATCH_ENTITIES],
      metadataProvider: ReflectMetadataProvider,
      connect: false,
    });

    try {
      const metadata = [...orm.getMetadata().getAll().values()];
      expect(metadata.map(item => item.tableName).sort()).toEqual([
        'feed',
        'feed_item',
        'like',
        'location',
        'main_area',
        'pair',
      ]);

      const indexes = metadata
        .flatMap(item => item.indexes)
        .map(index => index.name)
        .sort();
      expect(indexes).toEqual([
        'ix_feed_date_slot',
        'ix_feed_expires_at',
        'ix_feed_user_date',
        'ix_fi_candidate',
        'ix_fi_feed_target',
        'ix_lat_lng',
        'ix_like_inbox',
        'ix_like_outbox',
        'ix_main_area_parent',
        'ix_match_left_active',
        'ix_match_like_a',
        'ix_match_like_b',
        'ix_match_right_active',
        'spx_location_point',
      ]);
      expect(metadata.flatMap(item => item.uniques).map(unique => unique.name).sort())
        .toEqual([
          'uq_feed_user_date_slot',
          'uq_fi_feed_user',
          'uq_like_edge',
          'uq_main_area_code',
          'uq_match_pair_active',
        ]);

      const pair = orm.getMetadata().get('PairOrmEntity');
      expect(pair.properties.likeA.fieldNames).toEqual(['like_a_id']);
      expect(pair.properties.likeB.fieldNames).toEqual(['like_b_id']);
      expect(pair.properties.likeA.foreignKeyName)
        .toBe('FK_7e3c5378bd648337c58d37639b4');
      expect(pair.properties.likeB.foreignKeyName)
        .toBe('FK_3578c47763e9ed70bbedfbbf808');

      const feedItem = orm.getMetadata().get('FeedItemOrmEntity');
      expect(feedItem.properties.feed.foreignKeyName)
        .toBe('FK_91ca417c3b6e110dfefa311f7df');
      const feed = orm.getMetadata().get('FeedOrmEntity');
      expect(feed.properties.expiresAt.columnTypes).toEqual(['timestamptz']);
    } finally {
      await orm.close(true);
    }
  });
});
