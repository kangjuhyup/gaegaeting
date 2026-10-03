import { ulid } from "ulid";
import {
  EntityManager,
  FeedOrmEntity,
  LocationOrmEntity,
  MikroORM,
  PairOrmEntity,
  PostgreSqlDriver,
} from "@core/database/mikro";
import { bindTransactionBoundaryForTest } from "@core/database/testing";
import { YYYYMMDD } from "@core/util";
import type { UserPrincipal } from "@core/auth";
import { LocationEntity } from "#app/location/domain/model/location";
import { LocationOrmRepository } from "#app/location/infrastructure/adapter/outbound/presistence/location.orm.repository";
import { SetLocationCommand } from "#app/location/application/port/command/set-location.port";
import { SetLocationHandler } from "#app/location/application/service/command/set-location.command";
import { dailyFeedStep } from "../daily-feed.step.js";
import { createTestOrm } from "../../__test__/test-database.js";

const hasTestDatabase = [
  "DATABASE_HOST",
  "DATABASE_USERNAME",
  "DATABASE_PASSWORD",
  "DATABASE_NAME",
].every((name) => Boolean(process.env[name]));
const describeWithTestDatabase = hasTestDatabase ? describe : describe.skip;

describeWithTestDatabase("주변 사용자 일일 추천", () => {
  let orm: MikroORM<PostgreSqlDriver>;
  let em: EntityManager;
  let repository: LocationOrmRepository;
  let viewerId: string;
  let seededUserIds: string[];
  const date = new YYYYMMDD("20261003");
  const latitude = 37.5;
  const longitude = 127;

  beforeAll(async () => {
    orm = await createTestOrm();
  });
  beforeEach(async () => {
    seededUserIds = [];
    em = orm.em.fork();
    await em.begin();
    repository = new LocationOrmRepository(em);
    viewerId = await seedLocation(latitude, longitude);
  });
  afterEach(async () => {
    if (em?.isInTransaction()) await em.rollback();
    // Raw connection queries are not enlisted in the EntityManager transaction.
    // Delete only this test's users, including feeds written by the batch.
    const cleanup = orm.em.fork();
    await cleanup.nativeDelete(FeedOrmEntity, {
      userId: { $in: seededUserIds },
    });
    await cleanup.nativeDelete(PairOrmEntity, {
      $or: [
        { leftUserId: { $in: seededUserIds } },
        { rightUserId: { $in: seededUserIds } },
      ],
    });
    await cleanup.nativeDelete(LocationOrmEntity, {
      userId: { $in: seededUserIds },
    });
  });
  afterAll(async () => {
    await orm?.close(true);
  });

  async function seedLocation(lat: number, lng: number): Promise<string> {
    const userId = ulid();
    seededUserIds.push(userId);
    await em
      .getConnection()
      .execute(
        "INSERT INTO location (user_id, latitude, longitude) VALUES (?, ?, ?)",
        [userId, lat, lng],
      );
    return userId;
  }

  async function nearby() {
    return repository.findNearbyTargets(viewerId, latitude, longitude, date);
  }

  it.each([1, 2, 3] as const)(
    "자동 슬롯 %i에서도 수 km 떨어진 후보 중 가까운 두 명을 추천한다",
    async (slot) => {
      const nearest = await seedLocation(latitude + 0.01, longitude);
      const second = await seedLocation(latitude + 0.04, longitude);
      await seedLocation(latitude + 0.08, longitude);

      await dailyFeedStep(em, date, slot).run();

      const feed = await em.findOneOrFail(
        FeedOrmEntity,
        {
          userId: viewerId,
          date: date.toString(),
          slot,
        },
        { populate: ["items"] },
      );
      expect(
        feed.items
          .getItems()
          .map((item) => item.targetUserId)
          .sort(),
      ).toEqual([nearest, second].sort());
      expect(feed.expiresAt).toEqual(new Date("2026-10-04T00:00:00+09:00"));
    },
  );

  it("사각형 검색 영역 안이어도 실제 거리 10km를 넘으면 추천하지 않는다", async () => {
    const cornerLat = latitude + 0.08;
    const cornerLng = longitude + 0.1;
    const corner = LocationEntity.of({
      latitude: cornerLat,
      longitude: cornerLng,
    });
    const viewer = LocationEntity.of({ latitude, longitude });
    expect(viewer.distanceTo(corner)).toBeGreaterThan(10_000);
    await seedLocation(cornerLat, cornerLng);

    await expect(nearby()).resolves.toEqual([]);
  });

  it("10km 경계 안의 후보는 포함하고 경계 밖의 후보는 제외한다", async () => {
    const inside = await seedLocation(
      latitude + ((9_999 / 6_371_000) * 180) / Math.PI,
      longitude,
    );
    await seedLocation(
      latitude + ((10_001 / 6_371_000) * 180) / Math.PI,
      longitude,
    );
    await expect(nearby()).resolves.toEqual([inside]);
  });

  it("활성 매칭과 오늘 포함 최근 7일 추천은 제외하고 7일 전 추천은 다시 허용한다", async () => {
    const paired = await seedLocation(latitude + 0.001, longitude);
    const todayTarget = await seedLocation(latitude + 0.002, longitude);
    const recent = await seedLocation(latitude + 0.003, longitude);
    const eligible = await seedLocation(latitude + 0.004, longitude);
    const [left, right] = [viewerId, paired].sort();
    await em
      .getConnection()
      .execute(
        "INSERT INTO pair (left_user_id, right_user_id, active) VALUES (?, ?, true)",
        [left, right],
      );
    for (const [daysAgo, target] of [
      [0, todayTarget],
      [6, recent],
      [7, eligible],
    ] as const) {
      const rows = await em
        .getConnection()
        .execute<
          Array<{ id: number }>
        >("INSERT INTO feed (user_id, date, slot, expires_at) VALUES (?, ?, 1, ?) RETURNING id", [viewerId, date.subtract(daysAgo, "day").toString(), date.add(1, "day").toDate()]);
      await em
        .getConnection()
        .execute(
          "INSERT INTO feed_item (feed_id, target_user_id, state) VALUES (?, ?, 4)",
          [rows[0].id, target],
        );
    }
    await expect(nearby()).resolves.toEqual([eligible]);
  });

  it("현재 위치를 갱신하면 새 위치의 주변 사용자를 추천한다", async () => {
    const oldTarget = await seedLocation(latitude + 0.01, longitude);
    const newLatitude = latitude + 1;
    const newTarget = await seedLocation(newLatitude + 0.01, longitude);
    await expect(nearby()).resolves.toEqual([oldTarget]);
    const handler = new SetLocationHandler(repository);
    bindTransactionBoundaryForTest(handler, {
      owner: "test",
      run: (work) => work(),
    });

    await handler.execute(
      new SetLocationCommand(
        { userId: viewerId } as UserPrincipal,
        LocationEntity.of({ latitude: newLatitude, longitude }),
      ),
    );

    em.clear();
    const stored = await em.findOneOrFail(LocationOrmEntity, {
      userId: viewerId,
    });
    expect(Number(stored.latitude)).toBe(newLatitude);
    await expect(
      repository.findNearbyTargets(viewerId, newLatitude, longitude, date),
    ).resolves.toEqual([newTarget]);
  });
});
