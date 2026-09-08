import { ulid } from 'ulid';
import {
  EntityManager,
  FeedItemOrmEntity,
  FeedOrmEntity,
  MikroORM,
  PostgreSqlDriver,
  ref,
} from '@core/database/mikro';
import { YYYYMMDD } from '@core/util';
import { Step } from '#app/batch/step';
import { FeedEntity } from '#app/feed/domain/model/feed';
import { createTestOrm } from '../../__test__/test-database.js';
import { FeedExpiredProcessor } from '../feed-expired.processor.js';
import { FeedExpiredReader } from '../feed-expired.reader.js';
import { FeedExpiredWriter } from '../feed-expired.writer.js';

const hasTestDatabase = [
  'DATABASE_HOST',
  'DATABASE_USERNAME',
  'DATABASE_PASSWORD',
  'DATABASE_NAME',
].every(name => Boolean(process.env[name]));

const describeWithTestDatabase = hasTestDatabase ? describe : describe.skip;

describeWithTestDatabase('FeedExpired integration', () => {
  let orm: MikroORM<PostgreSqlDriver> | null = null;
  let em: EntityManager;
  const today = YYYYMMDD.today();

  beforeAll(async () => {
    orm = await createTestOrm();
  });

  beforeEach(async () => {
    if (!orm) throw new Error('Database is not initialized');
    em = orm.em.fork();
    await em.begin();
  });

  afterEach(async () => {
    if (em?.isInTransaction()) await em.rollback();
  });

  afterAll(async () => {
    await orm?.close(true);
    orm = null;
  });

  async function seedFeeds(options: {
    expiredCount: number;
    activeCount: number;
    withItemsEach?: number;
  }): Promise<{ expiredIds: number[]; activeIds: number[] }> {
    const now = new Date();
    const { expiredCount, activeCount, withItemsEach = 2 } = options;
    const createFeed = (expired: boolean, slot: number) =>
      em.create(FeedOrmEntity, {
        userId: ulid(),
        date: today.toString(),
        slot,
        expiresAt: new Date(now.getTime() + (expired ? -60_000 : 60_000)),
        createdAt: now,
        updatedAt: now,
      });

    const expired = Array.from({ length: expiredCount }, () => createFeed(true, 1));
    const active = Array.from({ length: activeCount }, () => createFeed(false, 2));
    em.persist([...expired, ...active]);
    await em.flush();

    for (const feed of [...expired, ...active]) {
      for (let index = 0; index < withItemsEach; index += 1) {
        em.persist(em.create(FeedItemOrmEntity, {
          feed: ref(FeedOrmEntity, feed.id),
          targetUserId: ulid(),
          state: 1,
          createdAt: now,
          updatedAt: now,
        }));
      }
    }
    await em.flush();
    return {
      expiredIds: expired.map(feed => feed.id),
      activeIds: active.map(feed => feed.id),
    };
  }

  it('reads every expired feed with keyset pagination', async () => {
    await seedFeeds({ expiredCount: 5, activeCount: 3, withItemsEach: 1 });
    const reader = new FeedExpiredReader(em, 2);
    const ids: number[] = [];

    for (;;) {
      const item = await reader.read();
      if (!item) break;
      ids.push(item.id);
      expect(item.expiresAt.getTime()).toBeLessThan(Date.now());
    }

    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
  });

  it('passes an expired feed through the processor unchanged', async () => {
    const { expiredIds } = await seedFeeds({ expiredCount: 1, activeCount: 0 });
    const item = await new FeedExpiredReader(em, 10).read();
    expect(item?.id).toBe(expiredIds[0]);
    await expect(new FeedExpiredProcessor().process(item!)).resolves.toBe(item);
  });

  it('deletes only expired feeds and cascades their items', async () => {
    const { expiredIds, activeIds } = await seedFeeds({
      expiredCount: 3,
      activeCount: 2,
      withItemsEach: 2,
    });
    const expiredRows = await em.find(FeedOrmEntity, { id: { $in: expiredIds } });
    const writer = new FeedExpiredWriter(em, 2);
    const items = expiredRows.map(row => FeedEntity.of({
      userId: row.userId,
      date: new YYYYMMDD(row.date),
      slot: row.slot,
      expiresAt: row.expiresAt,
    }).setPersistence(row.id, row.createdAt, row.updatedAt));

    await writer.write(items);
    await writer.write(items);

    await expect(em.count(FeedOrmEntity, { id: { $in: expiredIds } })).resolves.toBe(0);
    await expect(em.count(FeedOrmEntity, { id: { $in: activeIds } })).resolves.toBe(2);
    await expect(em.count(FeedItemOrmEntity, { feed: { $in: expiredIds } })).resolves.toBe(0);
    await expect(em.count(FeedItemOrmEntity, { feed: { $in: activeIds } })).resolves.toBe(4);
  });

  it('runs the complete reader, processor, and writer step', async () => {
    const { expiredIds, activeIds } = await seedFeeds({
      expiredCount: 6,
      activeCount: 4,
      withItemsEach: 1,
    });
    const step = new Step(
      new FeedExpiredReader(em, 3),
      new FeedExpiredProcessor(),
      new FeedExpiredWriter(em, 2),
      { name: 'feed_expired', chunkSize: 4 },
    );

    await expect(step.run()).resolves.toEqual({ read: 6, written: 6, skipped: 0 });
    await expect(em.count(FeedOrmEntity, { id: { $in: expiredIds } })).resolves.toBe(0);
    await expect(em.count(FeedOrmEntity, { id: { $in: activeIds } })).resolves.toBe(4);
    await expect(em.count(FeedItemOrmEntity, { feed: { $in: expiredIds } })).resolves.toBe(0);
  });
});
