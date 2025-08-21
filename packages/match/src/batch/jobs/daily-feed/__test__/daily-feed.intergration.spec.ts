import { DataSource, QueryRunner, EntityManager } from 'typeorm';
import { DailyFeedProcessor } from '../daily-feed.processor';
import { DailyFeedReader } from '../daily-feed.reader';
import { LocationEntity } from '@app/location/domain/model/location';
import { LocationOrmEntity, PairOrmEntity, FeedOrmEntity, FeedItemOrmEntity, LikeOrmEntity } from '@core/database';
import { ulid } from 'ulid';
import { createTestDataSource } from './test-database';
import { KrDateClass, YYYYMMDD } from '@core/util';
import { DailyFeedWriter } from '../daily-feed.writer';

describe('DailyFeed 통합 테스트', () => {
  let dataSource: DataSource | null = null;
  let queryRunner: QueryRunner | null = null;
  let em: EntityManager;

  let reader: DailyFeedReader;
  let processor: DailyFeedProcessor;

  const testDate: YYYYMMDD = YYYYMMDD.today();

  beforeAll(async () => {
    dataSource = await createTestDataSource();
  });

  beforeEach(async () => {
    if (!dataSource) throw new Error('DataSource not initialized');
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    em = queryRunner.manager;

    reader = new DailyFeedReader(em);
    processor = new DailyFeedProcessor(em, testDate);
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

  // ---------------- READER ----------------
  describe('READER', () => {
    it('데이터베이스에서 위치 정보를 읽어와야 함', async () => {
      await seedLocations(em, 5);
      const first = await reader.read();
      expect(first).toBeTruthy();
      const second = await reader.read();
      expect(second).toBeTruthy();

      const rest: any[] = [];
      for (let x; (x = await reader.read()) !== null; ) rest.push(x);

      expect(2 + rest.length).toBe(5);
    });

    it('페이지보다 데이터가 많을 경우 여러번 읽어와야 함', async () => {
      await seedLocations(em, 10);
      const first = await reader.read();
      expect(first).toBeTruthy();
      const second = await reader.read();
      expect(second).toBeTruthy();

      const rest: any[] = [];
      for (let x; (x = await reader.read()) !== null; ) rest.push(x);

      expect(2 + rest.length).toBe(10);
    });
  });

  // ---------------- PROCESSOR ----------------
  describe('PROCESSOR', () => {
    it('반경 내 후보자를 찾아야 함', async () => {
      const { viewerId, nearTargetIds } = await createTestLocations(em, {
        nearCount: 5,
        nearStartMeters: 300,
        nearStepMeters: 300, // 300, 600, 900, 1200, 1500m
      });

      const viewer = LocationEntity
        .of({ latitude: 37.5026, longitude: 127.0246 })
        .setPersistence(viewerId, new Date(), new Date());

      const result = await processor.process(viewer);

      expect(result).not.toBeNull();
      expect(result!.viewerId).toBe(viewerId);
      expect(result!.targets.length).toBeGreaterThan(0);
      expect(result!.targets.length).toBeLessThanOrEqual(2);

      // 가장 가까운 2명이어야 함
      const expectedTop2 = nearTargetIds.slice(0, 2);
      expect(new Set(result!.targets)).toEqual(new Set(expectedTop2));
    });

    it('활성 페어는 결과에서 제외해야 함', async () => {
      const { viewerId, nearTargetIds } = await createTestLocations(em, {
        nearCount: 5,
        nearStartMeters: 300,
        nearStepMeters: 300,
      });

      // 가장 가까운 1명과 활성 Pair 생성 → 결과는 2~3번째가 되어야 함
      await createActivePair(em, viewerId, nearTargetIds[0]);

      const viewerLocation = LocationEntity
        .of({ latitude: 37.5026, longitude: 127.0246 })
        .setPersistence(viewerId, new Date(), new Date());

      const result = await processor.process(viewerLocation);

      expect(result).not.toBeNull();
      expect(result!.viewerId).toBe(viewerId);

      const expected = nearTargetIds.slice(1, 3); // 2,3번째 가까운 사람
      expect(new Set(result!.targets)).toEqual(new Set(expected));
      expect(result!.targets).not.toContain(nearTargetIds[0]);
    });

    it('최근 피드에 포함된 타겟은 결과에서 제외해야 함', async () => {
      const { viewerId, nearTargetIds } = await createTestLocations(em, {
        nearCount: 5,
        nearStartMeters: 300,
        nearStepMeters: 300,
      });

      // 가장 가까운 1명을 최근 피드에 넣어 제외
      await createRecentFeed(em, viewerId, nearTargetIds[0], testDate);

      const viewerLocation = LocationEntity
        .of({ latitude: 37.5026, longitude: 127.0246 })
        .setPersistence(viewerId, new Date(), new Date());

      const result = await processor.process(viewerLocation);

      expect(result).not.toBeNull();
      expect(result!.viewerId).toBe(viewerId);

      const expected = nearTargetIds.slice(1, 3); // 2,3번째 가까운 사람
      expect(new Set(result!.targets)).toEqual(new Set(expected));
      expect(result!.targets).not.toContain(nearTargetIds[0]);
    });

    it('반경 내 후보가 없을 경우 null을 반환해야 함', async () => {
      const viewerId = ulid();
      await em.createQueryBuilder()
        .insert()
        .into(LocationOrmEntity)
        .values({
          userId: viewerId,
          latitude: 37.5026,
          longitude: 127.0246,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .execute();

      const viewerLocation = LocationEntity
        .of({ latitude: 37.5026, longitude: 127.0246 })
        .setPersistence(viewerId, new Date(), new Date());

      const result = await processor.process(viewerLocation);
      expect(result).toBeNull();
    });
  });

  describe('WRITER', () => {
    it('빈 아이템이면 아무 일도 하지 않아야 함', async () => {
      const slot: 1|2|3 = 1;
      const slotExpiresAt = new Date(Date.now() + 3600_000); // +1h
      const writer = new DailyFeedWriter(em, testDate, slot, slotExpiresAt);
  
      await writer.write([]); // 실행
  
      // 검증: 오늘 날짜/해당 슬롯에 생성된 feed 없음
      const feeds = await em.getRepository(FeedOrmEntity)
        .createQueryBuilder('f')
        .where('f.date = :d', { d: testDate.toString() })
        .andWhere('f.slot = :s', { s: slot })
        .getMany();
  
      expect(feeds.length).toBe(0);
    });
  
    it('여러 뷰어에 대해 feed를 upsert하고 feed_item을 삽입해야 함', async () => {
      // 뷰어 2명과 타겟들 준비(좌표는 상관 없음 — Writer는 테이블만 다룸)
      const viewerA = ulid();
      const viewerB = ulid();
      const targetA1 = ulid();
      const targetA2 = ulid();
      const targetB1 = ulid();
  
      // (선택) location에 뷰어/타겟을 넣을 필요는 없지만,
      // 스키마 제약이 없다면 생략 가능. 아래는 깔끔하게 넣어두는 예시:
      await seedLocations(em, 0); // no-op
      await em.createQueryBuilder().insert().into(LocationOrmEntity).values([
        { userId: viewerA, latitude: 37.5, longitude: 127.0, createdAt: new Date(), updatedAt: new Date() },
        { userId: viewerB, latitude: 37.5, longitude: 127.0, createdAt: new Date(), updatedAt: new Date() },
        { userId: targetA1, latitude: 37.5, longitude: 127.0, createdAt: new Date(), updatedAt: new Date() },
        { userId: targetA2, latitude: 37.5, longitude: 127.0, createdAt: new Date(), updatedAt: new Date() },
        { userId: targetB1, latitude: 37.5, longitude: 127.0, createdAt: new Date(), updatedAt: new Date() },
      ]).execute();
  
      const slot: 1|2|3 = 2;
      const slotExpiresAt = new Date(Date.now() + 2 * 3600_000);
      const writer = new DailyFeedWriter(em, testDate, slot, slotExpiresAt);
  
      const items = [
        { viewerId: viewerA, targets: [targetA1, targetA2] },
        { viewerId: viewerB, targets: [targetB1] },
      ];
  
      // 실행
      await writer.write(items);
  
      // 검증 1) feed가 뷰어별 1개씩 생성(날짜/슬롯 기준)
      const feeds = await em.getRepository(FeedOrmEntity)
        .createQueryBuilder('f')
        .where('f.user_id IN (:...uids)', { uids: [viewerA, viewerB] })
        .andWhere('f.date = :d', { d: testDate.toString() })
        .andWhere('f.slot = :s', { s: slot })
        .getMany();
  
      expect(feeds.length).toBe(2);
      const feedMap = new Map(feeds.map(f => [f.userId, f.id]));
      expect(feedMap.has(viewerA)).toBe(true);
      expect(feedMap.has(viewerB)).toBe(true);
  
      // 검증 2) feed_item 개수/값 확인
      const feedAId = feedMap.get(viewerA)!;
      const feedBId = feedMap.get(viewerB)!;
  
      const itemsA = await em.getRepository(FeedItemOrmEntity)
        .createQueryBuilder('fi')
        .where('fi.feed_id = :fid', { fid: feedAId })
        .getMany();
  
      const itemsB = await em.getRepository(FeedItemOrmEntity)
        .createQueryBuilder('fi')
        .where('fi.feed_id = :fid', { fid: feedBId })
        .getMany();
  
      // viewerA: 타겟 2명
      expect(itemsA.length).toBe(2);
      const aTargets = itemsA.map(x => x.targetUserId);
      expect(new Set(aTargets)).toEqual(new Set([targetA1, targetA2]));
      itemsA.forEach(x => {
        expect(x.state).toBe(1);
        const ms = Math.abs(new Date(x.expiresAt).getTime() - slotExpiresAt.getTime());
        expect(ms).toBeLessThan(1000); 
      });
  
      // viewerB: 타겟 1명
      expect(itemsB.length).toBe(1);
      expect(itemsB[0].targetUserId).toBe(targetB1);
      expect(itemsB[0].state).toBe(1);
      const ms = Math.abs(new Date(itemsB[0].expiresAt).getTime() - slotExpiresAt.getTime());
      expect(ms).toBeLessThan(1000); 
    });
  
    it('같은 뷰어가 items에 중복 포함돼도 feed는 1개만 존재해야 함(Upsert 확인)', async () => {
      const viewer = ulid();
      const t1 = ulid();
      const t2 = ulid();
      const t3 = ulid();
  
      // (선택) 위치 시드
      await em.createQueryBuilder().insert().into(LocationOrmEntity).values([
        { userId: viewer, latitude: 37.5, longitude: 127.0, createdAt: new Date(), updatedAt: new Date() },
        { userId: t1, latitude: 37.5, longitude: 127.0, createdAt: new Date(), updatedAt: new Date() },
        { userId: t2, latitude: 37.5, longitude: 127.0, createdAt: new Date(), updatedAt: new Date() },
        { userId: t3, latitude: 37.5, longitude: 127.0, createdAt: new Date(), updatedAt: new Date() },
      ]).execute();
  
      const slot: 1|2|3 = 3;
      const slotExpiresAt = new Date(Date.now() + 3 * 3600_000);
      const writer = new DailyFeedWriter(em, testDate, slot, slotExpiresAt);
  
      // 같은 viewer가 두 번 나오지만 feed는 upsert로 1개만
      const items = [
        { viewerId: viewer, targets: [t1, t2] },
        { viewerId: viewer, targets: [t3] },
      ];
  
      await writer.write(items);
  
      // feed는 1개
      const feeds = await em.getRepository(FeedOrmEntity)
        .createQueryBuilder('f')
        .where('f.user_id = :uid', { uid: viewer })
        .andWhere('f.date = :d', { d: testDate.toString() })
        .andWhere('f.slot = :s', { s: slot })
        .getMany();
  
      expect(feeds.length).toBe(1);
  
      // feed_item은 타겟 수만큼 들어간다.
      // (주의) feed_item에 UNIQUE(feed_id, target_user_id)가 없다면 중복 방지 없이 삽입됨.
      const feedId = feeds[0].id;
      const fi = await em.getRepository(FeedItemOrmEntity)
        .createQueryBuilder('fi')
        .where('fi.feed_id = :fid', { fid: feedId })
        .getMany();
  
      // UNIQUE가 없다면 3개가 들어가고, 있다면 중복 제거되어 3개 이하가 될 수 있음.
      // 테스트를 단정적으로 쓰려면 UNIQUE가 없다는 가정하에 3개를 기대:
      expect(fi.length).toBe(3);
      const ft = fi.map(x => x.targetUserId);
      expect(new Set(ft)).toEqual(new Set([t1, t2, t3]));
    });
  });
});

/* =================== helpers =================== */

async function seedLocations(em: EntityManager, count: number) {
  const rows = Array.from({ length: count }).map((_, i) => ({
    userId: ulid(),
    latitude: 37.5 + (i + 1) * 0.001,
    longitude: 127.0 + (i + 1) * 0.001,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  await em.createQueryBuilder().insert().into(LocationOrmEntity).values(rows).execute();
}

function metersToDeg(lat: number, meters: number) {
  const dLat = meters / 111_000;
  const dLng = meters / (111_000 * Math.cos((lat * Math.PI) / 180));
  return { dLat, dLng };
}

type CreateOpts = {
  nearCount?: number;
  nearStartMeters?: number;
  nearStepMeters?: number;
  farCount?: number;
  farMeters?: number;
  centerLat?: number;
  centerLng?: number;
};

async function createTestLocations(
  em: EntityManager,
  opts: CreateOpts = {},
): Promise<{
  viewerId: string;
  nearTargetIds: string[];
  farTargetIds: string[];
  allTargetIds: string[];
}> {
  const {
    nearCount = 5,
    nearStartMeters = 300,
    nearStepMeters = 300,
    farCount = 0,
    farMeters = 15_000,
    centerLat = 37.5026,
    centerLng = 127.0246,
  } = opts;

  const viewerId = ulid();

  // viewer
  await em.createQueryBuilder()
    .insert()
    .into(LocationOrmEntity)
    .values({
      userId: viewerId,
      latitude: centerLat,
      longitude: centerLng,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .execute();

  const nearTargetIds: string[] = [];
  const farTargetIds: string[] = [];

  // near targets (ascending distance)
  for (let i = 0; i < nearCount; i++) {
    const targetId = ulid();
    nearTargetIds.push(targetId);

    const meters = nearStartMeters + i * nearStepMeters;
    const { dLat, dLng } = metersToDeg(centerLat, meters);

    await em.createQueryBuilder()
      .insert()
      .into(LocationOrmEntity)
      .values({
        userId: targetId,
        latitude: centerLat + dLat,
        longitude: centerLng + dLng,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .execute();
  }

  // far targets (outside radius)
  for (let i = 0; i < farCount; i++) {
    const targetId = ulid();
    farTargetIds.push(targetId);

    const meters = farMeters + i * 500;
    const { dLat, dLng } = metersToDeg(centerLat, meters);

    await em.createQueryBuilder()
      .insert()
      .into(LocationOrmEntity)
      .values({
        userId: targetId,
        latitude: centerLat + dLat,
        longitude: centerLng + dLng,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .execute();
  }

  return {
    viewerId,
    nearTargetIds,
    farTargetIds,
    allTargetIds: [...nearTargetIds, ...farTargetIds],
  };
}

// active pair
async function createActivePair(em: EntityManager, viewerId: string, targetId: string): Promise<void> {
  const [leftUserId, rightUserId] = [viewerId, targetId].sort();

  const likeA = await em.createQueryBuilder()
    .insert()
    .into(LikeOrmEntity)
    .values({
      likerId: viewerId,
      likeeId: targetId,
      source: 1,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .execute();

  const likeB = await em.createQueryBuilder()
    .insert()
    .into(LikeOrmEntity)
    .values({
      likerId: targetId,
      likeeId: viewerId,
      source: 1,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .execute();

  await em.createQueryBuilder()
    .insert()
    .into(PairOrmEntity)
    .values({
      leftUserId,
      rightUserId,
      likeAId: likeA.identifiers[0].id,
      likeBId: likeB.identifiers[0].id,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .execute();
}

// recent feed
async function createRecentFeed(
  em: EntityManager,
  viewerId: string,
  targetId: string,
  date: YYYYMMDD,
): Promise<void> {
  const feed = await em.createQueryBuilder()
    .insert()
    .into(FeedOrmEntity)
    .values({
      userId: viewerId,
      date: date.toString(), // YYYYMMDD
      slot: 1,
    })
    .execute();

  const feedId = feed.identifiers[0].id;

  await em.createQueryBuilder()
    .insert()
    .into(FeedItemOrmEntity)
    .values({
      feedId,
      targetUserId: targetId,
      state: 1,
      expiresAt: date.add(1, 'day').toDate(),
    })
    .execute();
}
