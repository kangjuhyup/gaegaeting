// src/batch/feeds/__test__/feed-expired.int.spec.ts

import { DataSource, EntityManager, In, QueryRunner } from 'typeorm';
import { ulid } from 'ulid';
import { createTestDataSource } from '../../__test__/test-database';

import { FeedOrmEntity, FeedItemOrmEntity } from '@core/database';
import { YYYYMMDD } from '@core/util';
import { Step } from '@app/batch/step';
import { FeedExpiredProcessor } from '../feed-expired.processor';
import { FeedExpiredReader } from '../feed-expired.reader';
import { FeedExpiredWriter } from '../feed-expired.writer';
import { FeedEntity } from '@app/feed/domain/model/feed';

// 편의상 상태값 상수
const FEED_ITEM_STATE_NEW = 1;

describe('FeedExpired 통합 테스트', () => {
  let dataSource: DataSource | null = null;
  let queryRunner: QueryRunner | null = null;
  let em: EntityManager;

  const today = YYYYMMDD.today();

  beforeAll(async () => {
    dataSource = await createTestDataSource();
  });

  beforeEach(async () => {
    if (!dataSource) throw new Error('DataSource not initialized');
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    em = queryRunner.manager;
  });

  afterEach(async () => {
    if (queryRunner) {
      try {
        if (queryRunner.isTransactionActive) {
          await queryRunner.rollbackTransaction();
        }
      } finally {
        if (!queryRunner.isReleased) {
          await queryRunner.release();
        }
      }
      queryRunner = null;
    }
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    dataSource = null;
  });

  // ----------------- helpers -----------------
  async function seedFeeds(
    em: EntityManager,
    opts: {
      expiredCount: number;
      activeCount: number;
      withItemsEach?: number; // 각 feed 당 feed_item 몇 개 생성할지
    },
  ): Promise<{
    expiredIds: number[];
    activeIds: number[];
  }> {
    const now = new Date();
    const { expiredCount, activeCount, withItemsEach = 2 } = opts;

    const expiredRows = Array.from({ length: expiredCount }).map(() => ({
      userId: ulid(),
      date: today.toString(),
      slot: 1,
      expiresAt: new Date(now.getTime() - 60_000), // 과거(만료)
      createdAt: now,
      updatedAt: now,
    }));

    const activeRows = Array.from({ length: activeCount }).map(() => ({
      userId: ulid(),
      date: today.toString(),
      slot: 2,
      expiresAt: new Date(now.getTime() + 60_000), // 미래(활성)
      createdAt: now,
      updatedAt: now,
    }));

    const expiredInsert = await em
      .createQueryBuilder()
      .insert()
      .into(FeedOrmEntity)
      .values(expiredRows)
      .execute();
    const activeInsert = await em
      .createQueryBuilder()
      .insert()
      .into(FeedOrmEntity)
      .values(activeRows)
      .execute();

    const expiredIds = expiredInsert.identifiers.map((x: any) => x.id as number);
    const activeIds = activeInsert.identifiers.map((x: any) => x.id as number);

    // 각 feed에 feed_item 생성
    const allFeedIds = [...expiredIds, ...activeIds];
    const items = allFeedIds.flatMap((fid) =>
      Array.from({ length: withItemsEach }).map(() => ({
        feedId: fid,
        targetUserId: ulid(),
        state: FEED_ITEM_STATE_NEW,
        createdAt: now,
        updatedAt: now,
      })),
    );
    if (items.length > 0) {
      await em.createQueryBuilder().insert().into(FeedItemOrmEntity).values(items).execute();
    }

    return { expiredIds, activeIds };
  }

  // ----------------- READER -----------------
  describe('READER', () => {
    it('만료된 feed만 읽고, pageSize가 작아도 여러 번에 걸쳐 모두 반환해야 함(키셋 페이지네이션)', async () => {
      // 만료 5 / 활성 3
      await seedFeeds(em, { expiredCount: 5, activeCount: 3, withItemsEach: 1 });

      // pageSize를 작게(2) 설정해 여러 페이지로 읽게 함
      const reader = new FeedExpiredReader(em, 2);

      const seenIds: number[] = [];
      let readCount = 0;

      for (;;) {
        const item = await reader.read();
        if (!item) break;
        readCount++;
        seenIds.push(item.id!);
        // 만료만 읽혀야 함
        expect(item.expiresAt.getTime()).toBeLessThan(new Date().getTime());
      }

      expect(readCount).toBe(5);
      // 중복 없이 읽혔는지
      expect(new Set(seenIds).size).toBe(seenIds.length);
    });
  });

  // ----------------- PROCESSOR -----------------
  describe('PROCESSOR', () => {
    it('통과형 Processor는 아이템을 그대로 반환한다', async () => {
      const { expiredIds } = await seedFeeds(em, { expiredCount: 1, activeCount: 0 });
      const reader = new FeedExpiredReader(em, 10);
      const processor = new FeedExpiredProcessor();

      const first = await reader.read();
      expect(first).toBeTruthy();
      expect(expiredIds).toContain(first!.id!);

      const out = await processor.process(first!);
      expect(out).toBe(first);
    });
  });

  // ----------------- WRITER -----------------
  describe('WRITER', () => {
    it('만료 feed를 삭제하고, feed_item도 ON DELETE CASCADE로 함께 삭제되어야 함', async () => {
        const { expiredIds, activeIds } = await seedFeeds(em, {
            expiredCount: 3,
            activeCount: 2,
            withItemsEach: 2,
          });
        
          // ── pre-check: 삭제 전 상태 점검 ────────────────────────────────────────────
          const preExpiredFeeds = await em.getRepository(FeedOrmEntity).count({ where: { id: In(expiredIds) } });
          const preActiveFeeds  = await em.getRepository(FeedOrmEntity).count({ where: { id: In(activeIds) } });
          expect(preExpiredFeeds).toBe(3);
          expect(preActiveFeeds).toBe(2);
        
          const preExpiredItems = await em.getRepository(FeedItemOrmEntity).count({ where: { feedId: In(expiredIds) } });
          const preActiveItems  = await em.getRepository(FeedItemOrmEntity).count({ where: { feedId: In(activeIds) } });
          // withItemsEach=2 이므로 만료쪽은 최소 3*2=6개가 있어야 함
          expect(preExpiredItems).toBeGreaterThanOrEqual(6);
          expect(preActiveItems).toBeGreaterThanOrEqual(4);
        
          // ── 만료 대상만 엔티티 구성 (Reader 없이 직접) ─────────────────────────────
          const rows = await em.getRepository(FeedOrmEntity).find({ where: { id: In(expiredIds) } });
          expect(rows.length).toBe(3);
        
          const writer = new FeedExpiredWriter(em, 2);
          await writer.write(
            rows.map((r) =>
              FeedEntity.of({
                userId: r.userId,
                date: new YYYYMMDD(r.date),
                slot: r.slot,
                expiresAt: r.expiresAt,
              }).setPersistence(r.id, r.createdAt, r.updatedAt),
            ),
          );
        
          // ── post-check: 만료 feed 삭제 / 활성 feed 유지 / CASCADE 확인 ─────────────
          const stillExpired = await em.getRepository(FeedOrmEntity).count({ where: { id: In(expiredIds) } });
          expect(stillExpired).toBe(0);
        
          const stillActive = await em.getRepository(FeedOrmEntity).count({ where: { id: In(activeIds) } });
          expect(stillActive).toBe(2);
        
          const orphanItems = await em.getRepository(FeedItemOrmEntity).count({ where: { feedId: In(expiredIds) } });
          expect(orphanItems).toBe(0);
        
          const activeItems = await em.getRepository(FeedItemOrmEntity).count({ where: { feedId: In(activeIds) } });
          expect(activeItems).toBeGreaterThan(0);
        
          // ── 멱등성: 동일 write 재호출해도 변화 없어야 함 ───────────────────────────
          await writer.write(
            rows.map((r) =>
              FeedEntity.of({
                userId: r.userId,
                date: new YYYYMMDD(r.date),
                slot: r.slot,
                expiresAt: r.expiresAt,
              }).setPersistence(r.id, r.createdAt, r.updatedAt),
            ),
          );
        
          const againExpired = await em.getRepository(FeedOrmEntity).count({ where: { id: In(expiredIds) } });
          const againExpiredItems = await em.getRepository(FeedItemOrmEntity).count({ where: { feedId: In(expiredIds) } });
          expect(againExpired).toBe(0);
          expect(againExpiredItems).toBe(0);
        
          const againActive = await em.getRepository(FeedOrmEntity).count({ where: { id: In(activeIds) } });
          const againActiveItems = await em.getRepository(FeedItemOrmEntity).count({ where: { feedId: In(activeIds) } });
          expect(againActive).toBe(2);
          expect(againActiveItems).toBe(activeItems); // 변동 없음
    });
  });

  // ----------------- END-TO-END (Step) -----------------
  describe('END-TO-END Step', () => {
    it('Reader→Processor→Writer 전체 파이프라인이 만료분만 처리해야 함', async () => {
      const { expiredIds, activeIds } = await seedFeeds(em, {
        expiredCount: 6,
        activeCount: 4,
        withItemsEach: 1,
      });

      const reader = new FeedExpiredReader(em, 3); // 작은 페이지로 테스트
      const processor = new FeedExpiredProcessor();
      const writer = new FeedExpiredWriter(em, 2);

      const step = new Step(reader, processor, writer, {
        name : `feed_expired`,
        chunkSize: 4,
        onChunkStart: () => {},
        onChunkEnd: () => {},
      });

      const result = await step.run();
      // 읽고-쓴 개수는 만료 개수와 동일해야 함(Processor가 모두 통과)
      expect(result.read).toBe(expiredIds.length);
      expect(result.written).toBe(expiredIds.length);
      expect(result.skipped).toBe(0);

      // DB 검증: 만료 feed는 제거, 활성 feed는 생존
      const expiredStill = await em
        .getRepository(FeedOrmEntity)
        .createQueryBuilder('f')
        .where('f.id IN (:...ids)', { ids: expiredIds })
        .getMany();
      expect(expiredStill.length).toBe(0);

      const activeStill = await em
        .getRepository(FeedOrmEntity)
        .createQueryBuilder('f')
        .where('f.id IN (:...ids)', { ids: activeIds })
        .getMany();
      expect(activeStill.length).toBe(activeIds.length);

      // 만료 feed의 item은 전부 CASCADE로 삭제되었어야 함
      const expiredItemsStill = await em
        .getRepository(FeedItemOrmEntity)
        .createQueryBuilder('fi')
        .where('fi.feed_id IN (:...ids)', { ids: expiredIds })
        .getMany();
      expect(expiredItemsStill.length).toBe(0);
    });
  });
});