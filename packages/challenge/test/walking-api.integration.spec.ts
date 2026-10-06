import "reflect-metadata";
import { jest } from "@jest/globals";
import {
  type INestApplication,
  ValidationPipe,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { EntityManager } from "@core/database/mikro";
import { createInternalAuthAssertion } from "@core/auth-assertion";
import { randomUUID } from "node:crypto";
import { PNG } from "pngjs";
import request from "supertest";
import { ChallengeClock } from "../src/shared/application/challenge-clock.js";
import { WalkingAccountPort } from "../src/shared/application/walking-account.port.js";
import { WalkingPhotoStorage } from "../src/diary/application/walking-photo-storage.port.js";
import { DiaryRepository } from "../src/diary/application/diary.repository.js";
import { ActivityCommands } from "../src/activity/application/activity.commands.js";
import { MediaCleanupWorker } from "../src/diary/infrastructure/storage/media-cleanup.worker.js";
import { runChallengeMigrations } from "../src/migrations/migrate.js";

const integration =
  process.env.CHALLENGE_INTEGRATION_TESTS === "1" ? describe : describe.skip;
const secret = "walking-integration-assertion-secret-at-least-32-characters";
const internalSecret =
  "walking-integration-activity-secret-at-least-32-characters";
const walkFields =
  "id state requestId revision points { latitude longitude recordedAt accuracyMeters segment } segments { startedAt endedAt } startedAt endedAt distanceMeters completed coverage pets { id name } route { id title path { latitude longitude } }";
const diaryFields =
  "id walkId routeId content mood visibility revision savedAt walkDate photos { id status url }";
const routeFields =
  "id title path { latitude longitude } distanceMeters isLoop walkerCount bookmarked";

integration("공유 코스·산책·일기 백엔드 API", () => {
  let app: INestApplication, em: EntityManager, now: Date;
  const objects = new Map<string, Uint8Array>();
  let failDelete = false;
  let accountAvailable = true;
  const storage: WalkingPhotoStorage = {
    uploadUrl: async (key) => `https://storage.test/upload/${key}`,
    downloadUrl: async (key) => `https://storage.test/private/${key}`,
    read: async (key) => {
      const bytes = objects.get(key);
      if (!bytes) throw new Error("Missing upload");
      return bytes;
    },
    write: async (key, bytes) => {
      objects.set(key, bytes);
    },
    delete: async (key) => {
      if (failDelete) throw new Error("Storage unavailable");
      objects.delete(key);
    },
  };
  beforeAll(async () => {
    if (
      !["127.0.0.1", "localhost"].includes(process.env.DATABASE_HOST ?? "") ||
      !process.env.DATABASE_NAME?.startsWith("challenge_test_")
    )
      throw new Error("Isolated local test database required");
    Object.assign(process.env, {
      NODE_ENV: "test",
      DATABASE_LOG: "false",
      INTERNAL_AUTH_ASSERTION_SECRET: secret,
      CHALLENGE_ACTIVITY_SECRET: internalSecret,
    });
    await runChallengeMigrations();
    const { AppModule } = await import("../src/app.module.js");
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ChallengeClock)
      .useValue({ now: () => now })
      .overrideProvider(WalkingAccountPort)
      .useValue({
        owner: async (user: { userId: string }) => {
          if (!accountAvailable) throw new Error("Account unavailable");
          return {
            nickname: `${user.userId} 보호자`,
            pets: [{ id: 1, name: "보리" }],
          };
        },
      })
      .overrideProvider(WalkingPhotoStorage)
      .useValue(storage)
      .compile();
    app = module.createNestApplication({ logger: false });
    app.setGlobalPrefix("challenge");
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    em = app.get(EntityManager).fork();
  });
  beforeEach(async () => {
    now = new Date("2026-10-05T00:00:00Z");
    objects.clear();
    failDelete = false;
    accountAvailable = true;
    await em
      .getConnection()
      .execute(
        "TRUNCATE walking_record, walking_route, walking_diary, walking_photo, walking_route_bookmark, walking_route_report, walking_media_cleanup, challenge_activity, challenge_enrollment, challenge_deleted_user CASCADE",
      );
    em.clear();
  });
  afterAll(async () => {
    await app?.close();
  });
  function token(
    userId = "viewer",
    roles: string[] = [],
    scopes = ["challenge:read", "challenge:write"],
  ) {
    return createInternalAuthAssertion(
      { userId, tenantId: "test", subject: userId, scopes, roles },
      { secret, issuer: "gaegaeting-gateway", audience: "challenge" },
    );
  }
  async function gql(
    query: string,
    variables: object = {},
    userId = "viewer",
    roles: string[] = [],
    scopes?: string[],
  ) {
    return (
      await request(app.getHttpServer())
        .post("/challenge/graphql")
        .set("x-gaegaeting-principal", token(userId, roles, scopes))
        .send({ query, variables })
    ).body;
  }
  function ok(result: any, field: string): any {
    expect(result.errors).toBeUndefined();
    return result.data[field];
  }
  async function start(
    userId = "viewer",
    routeId?: string,
    requestId = randomUUID(),
  ) {
    return ok(
      await gql(
        `mutation($input: StartWalkInput!) { startWalk(input: $input) { ${walkFields} } }`,
        { input: { requestId, petIds: [1], routeId } },
        userId,
      ),
      "startWalk",
    );
  }
  async function append(
    id: string,
    points: object[],
    userId = "viewer",
    fromIndex = 0,
  ) {
    return gql(
      `mutation($input: AppendWalkPointsInput!) { appendWalkPoints(input: $input) { ${walkFields} } }`,
      { input: { walkId: id, fromIndex, points } },
      userId,
    );
  }
  async function finish(
    id: string,
    userId = "viewer",
    endedAt = now.toISOString(),
  ) {
    return gql(
      `mutation($id: ID!, $endedAt: DateTime!) { finishWalk(id: $id, endedAt: $endedAt) { ${walkFields} } }`,
      { id, endedAt },
      userId,
    );
  }
  async function walk(userId = "viewer", routeId?: string) {
    const started = await start(userId, routeId),
      base = now.getTime();
    const points = Array.from({ length: 31 }, (_, i) => ({
      latitude: 37 + i * 0.0001,
      longitude: 127,
      recordedAt: new Date(base + i * 10_000).toISOString(),
      accuracyMeters: 5,
      segment: 0,
    }));
    now = new Date(base + 310_000);
    ok(await append(started.id, points, userId), "appendWalkPoints");
    return ok(await finish(started.id, userId), "finishWalk");
  }
  async function route(publish = true) {
    const source = await walk("author");
    const created = ok(
      await gql(
        `mutation($input: CreateWalkingRouteInput!) { createWalkingRoute(input: $input) { id status revision sourceWalkId path { latitude longitude } } }`,
        {
          input: {
            requestId: randomUUID(),
            walkId: source.id,
            fromIndex: 0,
            toIndex: 30,
            details: {
              title: "보리의 그늘길",
              description: "나무가 많은 산책길",
              startPlace: "공원 입구",
              endPlace: "분수대",
              tags: ["SHADE"],
            },
          },
        },
        "author",
      ),
      "createWalkingRoute",
    );
    if (publish) {
      const pending = ok(
        await gql(
          "mutation($id: ID!) { submitWalkingRoute(id: $id) { revision status } }",
          { id: created.id },
          "author",
        ),
        "submitWalkingRoute",
      );
      ok(
        await gql(
          'mutation($id: ID!, $revision: Int!) { reviewWalkingRoute(id: $id, revision: $revision, decision: "PUBLISH") }',
          { id: created.id, revision: pending.revision },
          "admin",
          ["ADMIN"],
        ),
        "reviewWalkingRoute",
      );
    }
    return { ...created, source };
  }
  async function saveDiary(
    walkId: string,
    extra: object = {},
    userId = "viewer",
  ) {
    return gql(
      `mutation($input: SaveWalkingDiaryInput!) { saveWalkingDiary(input: $input) { ${diaryFields} } }`,
      {
        input: {
          walkId,
          expectedRevision: 0,
          content: "보리랑 즐거운 산책",
          ...extra,
        },
      },
      userId,
    );
  }
  async function upload(walkId: string, userId = "viewer") {
    const begin = ok(
      await gql(
        "mutation($id: ID!) { beginWalkingPhotoUpload(walkId: $id) { id uploadUrl maxBytes maxDimension } }",
        { id: walkId },
        userId,
      ),
      "beginWalkingPhotoUpload",
    );
    const png = new PNG({ width: 2, height: 2 });
    png.data.fill(255);
    objects.set(`walking/uploads/${begin.id}.png`, PNG.sync.write(png));
    return ok(
      await gql(
        "mutation($id: ID!) { completeWalkingPhotoUpload(id: $id) { id status url } }",
        { id: begin.id },
        userId,
      ),
      "completeWalkingPhotoUpload",
    );
  }
  async function join(kind = "WALK_DIARY") {
    return ok(
      await gql(
        "mutation($input: JoinChallengeInput!) { joinChallenge(input: $input) { id } }",
        { input: { requestId: randomUUID(), kind } },
      ),
      "joinChallenge",
    ).id;
  }
  async function progress(id: string) {
    return ok(
      await gql(
        "query($id: ID!) { myChallenge(id: $id) { progressCount status } }",
        { id },
      ),
      "myChallenge",
    );
  }

  it("같은 시작 요청을 동시에 보내도 산책 하나만 만들고 Account 장애 중에도 재조회한다", async () => {
    const requestId = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 6 }, () => start("viewer", undefined, requestId)),
    );
    expect(new Set(results.map((r) => r.id)).size).toBe(1);
    accountAvailable = false;
    expect((await start("viewer", undefined, requestId)).id).toBe(
      results[0].id,
    );
    expect((await gql("{ myCurrentWalk { id } }")).data.myCurrentWalk.id).toBe(
      results[0].id,
    );
  });
  it("다른 시작 요청은 진행 중 산책이 있으면 거절하고 타인의 반려견을 선택할 수 없다", async () => {
    await start();
    for (const petIds of [[1], [2], []]) {
      const result = await gql(
        "mutation($input: StartWalkInput!) { startWalk(input: $input) { id } }",
        { input: { requestId: randomUUID(), petIds } },
      );
      expect(result.errors).toHaveLength(1);
    }
  });
  it("원본 산책은 작성자에게만 조회·추가·종료·삭제를 허용한다", async () => {
    const value = await start();
    for (const query of [
      "query($id: ID!) { myWalk(id: $id) { points { latitude } } }",
      "mutation($id: ID!) { deleteWalk(id: $id) }",
      "query($id: ID!) { myWalkDiary(walkId: $id) { content } }",
    ]) {
      expect((await gql(query, { id: value.id }, "other")).errors).toHaveLength(
        1,
      );
    }
    expect((await finish(value.id, "other")).errors).toHaveLength(1);
    expect((await gql("{ myWalks { id } }", {}, "other")).data.myWalks).toEqual(
      [],
    );
  });
  it("좌표 재전송은 중복을 만들지 않고 순서 충돌·미래 좌표·임의 실적 필드를 거절한다", async () => {
    const value = await start();
    now = new Date(now.getTime() + 20_000);
    const point = {
      latitude: 37,
      longitude: 127,
      recordedAt: value.startedAt,
      accuracyMeters: 10,
      segment: 0,
    };
    ok(await append(value.id, [point]), "appendWalkPoints");
    expect(
      ok(await append(value.id, [point]), "appendWalkPoints").points,
    ).toHaveLength(1);
    expect(
      (await append(value.id, [{ ...point, latitude: 38 }])).errors,
    ).toHaveLength(1);
    expect(
      (
        await append(
          value.id,
          [
            {
              ...point,
              recordedAt: new Date(now.getTime() + 1000).toISOString(),
            },
          ],
          "viewer",
          1,
        )
      ).errors,
    ).toHaveLength(1);
    expect(
      (await append(value.id, [{ ...point, completed: true }], "viewer", 1))
        .errors,
    ).toHaveLength(1);
    expect((await append(value.id, [point], "viewer", 4)).errors).toHaveLength(
      1,
    );
  });
  it("일시정지 중 좌표를 거절하고 재개 후에는 별도 구간으로 기록한다", async () => {
    const value = await start();
    const initial = now.getTime();
    now = new Date(initial + 10_000);
    ok(
      await gql(
        "mutation($id: ID!) { setWalkPaused(id: $id, paused: true) { state } }",
        { id: value.id },
      ),
      "setWalkPaused",
    );
    now = new Date(initial + 30_000);
    expect(
      (
        await append(value.id, [
          {
            latitude: 37,
            longitude: 127,
            recordedAt: new Date(initial + 20_000).toISOString(),
            accuracyMeters: 5,
            segment: 0,
          },
        ])
      ).errors,
    ).toHaveLength(1);
    const resumed = ok(
      await gql(
        "mutation($id: ID!) { setWalkPaused(id: $id, paused: false) { state segments { startedAt endedAt } } }",
        { id: value.id },
      ),
      "setWalkPaused",
    );
    expect(resumed.segments).toHaveLength(2);
    ok(
      await append(value.id, [
        {
          latitude: 37,
          longitude: 127,
          recordedAt: now.toISOString(),
          accuracyMeters: 5,
          segment: 1,
        },
      ]),
      "appendWalkPoints",
    );
  });
  it("코스 초안은 비공개이며 운영자 승인 후 좌표·소개·강아지 이름을 검색할 수 있다", async () => {
    const value = await route(false);
    expect(
      (
        await gql(
          `query($id: ID!) { walkingRoute(id: $id) { ${routeFields} } }`,
          { id: value.id },
        )
      ).errors,
    ).toHaveLength(1);
    const pending = ok(
      await gql(
        "mutation($id: ID!) { submitWalkingRoute(id: $id) { revision } }",
        { id: value.id },
        "author",
      ),
      "submitWalkingRoute",
    );
    const review =
      'mutation($id: ID!, $revision: Int!) { reviewWalkingRoute(id: $id, revision: $revision, decision: "PUBLISH") }';
    expect(
      (await gql(review, { id: value.id, revision: pending.revision }))
        .errors[0].extensions.code,
    ).toBe("FORBIDDEN");
    expect(
      (await gql(review, { id: value.id, revision: 999 }, "admin", ["ADMIN"]))
        .errors,
    ).toHaveLength(1);
    ok(
      await gql(review, { id: value.id, revision: pending.revision }, "admin", [
        "ADMIN",
      ]),
      "reviewWalkingRoute",
    );
    const publicRoute = ok(
      await gql(
        `query($id: ID!) { walkingRoute(id: $id) { ${routeFields} authorName petNames } }`,
        { id: value.id },
      ),
      "walkingRoute",
    );
    expect(publicRoute.path).toEqual(value.path);
    expect(publicRoute.petNames).toEqual(["보리"]);
    const search = ok(
      await gql(
        `query($input: WalkingRouteSearchInput!) { walkingRoutes(input: $input) { id nearbyMeters } }`,
        {
          input: {
            latitude: 37,
            longitude: 127,
            tags: ["SHADE"],
            isLoop: false,
          },
        },
      ),
      "walkingRoutes",
    );
    expect(search).toEqual([{ id: value.id, nearbyMeters: 0 }]);
    expect(
      (
        await gql(
          "query($id: ID!) { walkingRoute(id: $id) { sourceWalkId } }",
          { id: value.id },
        )
      ).errors,
    ).toBeDefined();
  });
  it("다른 보호자의 코스 완주는 챌린지·여권·고유 완주 인원에 자동 반영된다", async () => {
    const value = await route();
    const enrollment = await join("NEIGHBORHOOD_EXPLORER");
    const first = await walk("viewer", value.id);
    expect(first.completed).toBe(true);
    expect((await progress(enrollment)).progressCount).toBe(1);
    await walk("viewer", value.id);
    await walk("author", value.id);
    expect((await progress(enrollment)).progressCount).toBe(1);
    expect(
      ok(
        await gql(`query($id: ID!) { walkingRoute(id: $id) { walkerCount } }`, {
          id: value.id,
        }),
        "walkingRoute",
      ).walkerCount,
    ).toBe(1);
    expect(
      ok(
        await gql("{ myWalkingPassport { routeId completedCount } }"),
        "myWalkingPassport",
      ),
    ).toEqual([{ routeId: value.id, completedCount: 2 }]);
    const finishedAgain = ok(
      await finish(first.id, "viewer", first.endedAt),
      "finishWalk",
    );
    expect(finishedAgain.revision).toBe(first.revision);
  });
  it("코스를 북마크·신고하고 공개 중단하면 목록·시작·공개 후기를 차단한다", async () => {
    const value = await route();
    ok(
      await gql(
        'mutation($id: ID!) { bookmarkWalkingRoute(id: $id, saved: true) reportWalkingRoute(id: $id, reason: "UNSAFE") }',
        { id: value.id },
      ),
      "bookmarkWalkingRoute",
    );
    expect(
      ok(
        await gql("{ myBookmarkedWalkingRoutes { id } }"),
        "myBookmarkedWalkingRoutes",
      ),
    ).toHaveLength(1);
    expect(
      (await gql("{ walkingRouteReports { id } }")).errors[0].extensions.code,
    ).toBe("FORBIDDEN");
    expect(
      ok(
        await gql("{ walkingRouteReports { routeId reason } }", {}, "admin", [
          "ADMIN",
        ]),
        "walkingRouteReports",
      ),
    ).toEqual([{ routeId: value.id, reason: "UNSAFE" }]);
    ok(
      await gql(
        "mutation($id: ID!) { withdrawWalkingRoute(id: $id) { status } }",
        { id: value.id },
        "author",
      ),
      "withdrawWalkingRoute",
    );
    expect(
      ok(
        await gql("{ myBookmarkedWalkingRoutes { id } }"),
        "myBookmarkedWalkingRoutes",
      ),
    ).toEqual([]);
    expect(
      (
        await gql(
          "query($id: ID!) { walkingRouteReviews(routeId: $id) { content } }",
          { id: value.id },
        )
      ).errors,
    ).toHaveLength(1);
    expect(
      (
        await gql(
          "mutation($input: StartWalkInput!) { startWalk(input: $input) { id } }",
          {
            input: { requestId: randomUUID(), petIds: [1], routeId: value.id },
          },
        )
      ).errors,
    ).toHaveLength(1);
  });
  it("원본 저장 후 실적 반영에 실패하면 산책 종료 전체가 롤백된다", async () => {
    const value = await start();
    const activity = app.get(ActivityCommands);
    const original = activity.recordActivity.bind(activity);
    const spy = jest
      .spyOn(activity, "recordActivity")
      .mockImplementation(async (update) => {
        await original(update);
        throw new Error("Projection failure");
      });
    try {
      expect((await finish(value.id)).errors).toHaveLength(1);
    } finally {
      spy.mockRestore();
    }
    expect(
      ok(
        await gql("query($id: ID!) { myWalk(id: $id) { state } }", {
          id: value.id,
        }),
        "myWalk",
      ).state,
    ).toBe("RECORDING");
    expect(
      await em
        .getConnection()
        .execute("SELECT source_id FROM challenge_activity"),
    ).toEqual([]);
    ok(await finish(value.id), "finishWalk");
  });
  it("일기는 기본 비공개이며 완료한 산책 하나에 하나만 저장하고 재시도에 같은 결과를 반환한다", async () => {
    const value = await walk();
    const first = ok(await saveDiary(value.id), "saveWalkingDiary");
    expect(first.visibility).toBe("PRIVATE");
    expect(first.walkDate).toBe("2026-10-05");
    expect(ok(await saveDiary(value.id), "saveWalkingDiary").id).toBe(first.id);
    expect(
      (await saveDiary(value.id, { content: "동시에 다른 내용" })).errors,
    ).toHaveLength(1);
    expect(
      (
        await gql(
          "query($id: ID!) { myWalkingDiary(id: $id) { content } }",
          { id: first.id },
          "other",
        )
      ).errors,
    ).toHaveLength(1);
    expect(
      (await saveDiary(value.id, { expectedRevision: 1, visibility: "PUBLIC" }))
        .errors,
    ).toHaveLength(1);
  });
  it("완주 후 공개한 일기만 후기에 나오며 같은 코스의 최신 후기 하나만 유지한다", async () => {
    const value = await route();
    const firstWalk = await walk("viewer", value.id);
    const first = ok(
      await saveDiary(firstWalk.id, { visibility: "PUBLIC" }),
      "saveWalkingDiary",
    );
    const second = await walk("viewer", value.id);
    const latest = ok(
      await saveDiary(second.id, {
        visibility: "PUBLIC",
        content: "다시 다녀왔어요",
      }),
      "saveWalkingDiary",
    );
    expect(
      ok(
        await gql(
          "query($id: ID!) { walkingRouteReviews(routeId: $id) { id content walkDate } }",
          { id: value.id },
        ),
        "walkingRouteReviews",
      ),
    ).toEqual([
      { id: latest.id, content: "다시 다녀왔어요", walkDate: "2026-10-05" },
    ]);
    expect(
      ok(
        await gql(
          "query($id: ID!) { myWalkingDiary(id: $id) { visibility revision } }",
          { id: first.id },
        ),
        "myWalkingDiary",
      ),
    ).toEqual({ visibility: "PRIVATE", revision: 2 });
    expect(
      (
        await gql(
          "query($id: ID!) { walkingRouteReviews(routeId: $id) { walkId savedAt } }",
          { id: value.id },
        )
      ).errors,
    ).toBeDefined();
  });
  it("검증된 사진과 기분을 저장하면 일기 챌린지를 인정하고 사진 삭제 시 회수한다", async () => {
    const enrollment = await join();
    const value = await walk();
    const photo = await upload(value.id);
    const diary = ok(
      await saveDiary(value.id, { photoIds: [photo.id], mood: "HAPPY" }),
      "saveWalkingDiary",
    );
    expect(diary.photos[0].url).toContain("/walking/ready/");
    expect((await progress(enrollment)).progressCount).toBe(1);
    ok(
      await gql("mutation($id: ID!) { deleteWalkingPhoto(id: $id) }", {
        id: photo.id,
      }),
      "deleteWalkingPhoto",
    );
    expect((await progress(enrollment)).progressCount).toBe(0);
    expect(
      ok(
        await gql(
          "query($id: ID!) { myWalkingDiary(id: $id) { revision photos { id } } }",
          { id: diary.id },
        ),
        "myWalkingDiary",
      ),
    ).toEqual({ revision: 2, photos: [] });
    failDelete = true;
    await app.get(MediaCleanupWorker).run();
    const jobs = await em
      .getConnection()
      .execute(
        "SELECT attempts FROM walking_media_cleanup WHERE object_key LIKE 'walking/ready/%'",
      );
    expect(jobs).toEqual([{ attempts: 1 }]);
    failDelete = false;
    now = new Date(now.getTime() + 600_000);
    await app.get(MediaCleanupWorker).run();
    expect(objects.size).toBe(0);
  });
  it("타인의 사진·미완료 업로드·임의 URL을 일기에 연결하지 못한다", async () => {
    const value = await walk();
    const other = await walk("other");
    const photo = await upload(other.id, "other");
    expect(
      (await saveDiary(value.id, { photoIds: [photo.id] })).errors,
    ).toHaveLength(1);
    expect(
      (
        await saveDiary(value.id, {
          photoIds: ["https://arbitrary.test/image.png"],
        })
      ).errors,
    ).toHaveLength(1);
    const pending = ok(
      await gql(
        "mutation($id: ID!) { beginWalkingPhotoUpload(walkId: $id) { id } }",
        { id: value.id },
      ),
      "beginWalkingPhotoUpload",
    );
    expect(
      (await saveDiary(value.id, { photoIds: [pending.id] })).errors,
    ).toHaveLength(1);
    expect(
      (
        await gql(
          "mutation($id: ID!) { completeWalkingPhotoUpload(id: $id) { id } }",
          { id: photo.id },
        )
      ).errors,
    ).toHaveLength(1);
  });
  it("PNG 위장 파일은 거절하고 검증 완료 후 staging 파일을 바꿔도 확정 사진이 바뀌지 않는다", async () => {
    const value = await walk();
    const begin = ok(
      await gql(
        "mutation($id: ID!) { beginWalkingPhotoUpload(walkId: $id) { id } }",
        { id: value.id },
      ),
      "beginWalkingPhotoUpload",
    );
    objects.set(`walking/uploads/${begin.id}.png`, Buffer.from("fake png"));
    expect(
      (
        await gql(
          "mutation($id: ID!) { completeWalkingPhotoUpload(id: $id) { id } }",
          { id: begin.id },
        )
      ).errors,
    ).toHaveLength(1);
    const photo = await upload(value.id);
    const stored = await app.get(DiaryRepository).photo(photo.id);
    const frozen = objects.get(stored!.objectKey!)!;
    objects.set(stored!.uploadKey, Buffer.from("changed"));
    const again = ok(
      await gql(
        "mutation($id: ID!) { completeWalkingPhotoUpload(id: $id) { id url } }",
        { id: photo.id },
      ),
      "completeWalkingPhotoUpload",
    );
    expect(again.url).toBe(photo.url);
    expect(objects.get(stored!.objectKey!)).toEqual(frozen);
  });
  it("일기 삭제는 실적을 없애고 새로 작성하면 새 식별자를 발급한다", async () => {
    const enrollment = await join();
    const value = await walk();
    const photo = await upload(value.id);
    const first = ok(
      await saveDiary(value.id, { photoIds: [photo.id], mood: "HAPPY" }),
      "saveWalkingDiary",
    );
    for (let i = 0; i < 2; i++)
      ok(
        await gql("mutation($id: ID!) { deleteWalkingDiary(id: $id) }", {
          id: first.id,
        }),
        "deleteWalkingDiary",
      );
    expect((await progress(enrollment)).progressCount).toBe(0);
    const second = ok(await saveDiary(value.id), "saveWalkingDiary");
    expect(second.id).not.toBe(first.id);
  });
  it("원본 산책을 삭제하면 좌표·일기·파생 코스를 제거하고 삭제 요청 재전송을 허용한다", async () => {
    const value = await route();
    const diary = ok(
      await saveDiary(value.source.id, {}, "author"),
      "saveWalkingDiary",
    );
    await upload(value.source.id, "author");
    for (let i = 0; i < 2; i++)
      ok(
        await gql(
          "mutation($id: ID!) { deleteWalk(id: $id) }",
          { id: value.source.id },
          "author",
        ),
        "deleteWalk",
      );
    expect(
      (
        await gql("query($id: ID!) { walkingRoute(id: $id) { id } }", {
          id: value.id,
        })
      ).errors,
    ).toHaveLength(1);
    expect(
      (
        await gql(
          "query($id: ID!) { myWalkingDiary(id: $id) { id } }",
          { id: diary.id },
          "author",
        )
      ).errors,
    ).toHaveLength(1);
    const rows = await em
      .getConnection()
      .execute(
        "SELECT points, pets, author_name, started_at FROM walking_record WHERE id = ?",
        [value.source.id],
      );
    expect(rows).toEqual([
      { points: [], pets: [], author_name: "", started_at: null },
    ]);
  });
  it("탈퇴는 모든 원본과 실적을 지우고 사진 정리를 예약하며 뒤늦은 재등록을 막는다", async () => {
    const value = await route();
    await upload(value.source.id, "author");
    await saveDiary(value.source.id, {}, "author");
    const other = await walk();
    const response = await request(app.getHttpServer())
      .delete("/challenge/internal/v1/users/author")
      .set("authorization", `Bearer ${internalSecret}`);
    expect(response.status).toBe(204);
    for (const table of [
      "walking_record",
      "walking_route",
      "walking_diary",
      "walking_photo",
      "challenge_activity",
    ])
      expect(
        await em
          .getConnection()
          .execute(`SELECT user_id FROM ${table} WHERE user_id = ?`, [
            "author",
          ]),
      ).toEqual([]);
    expect(
      ok(
        await gql("query($id: ID!) { myWalk(id: $id) { id } }", {
          id: other.id,
        }),
        "myWalk",
      ).id,
    ).toBe(other.id);
    expect(
      (
        await gql(
          "mutation($input: StartWalkInput!) { startWalk(input: $input) { id } }",
          { input: { requestId: randomUUID(), petIds: [1] } },
          "author",
        )
      ).errors,
    ).toHaveLength(1);
    expect(
      (
        await em
          .getConnection()
          .execute("SELECT object_key FROM walking_media_cleanup")
      ).length,
    ).toBeGreaterThan(0);
  });
  it("읽기 권한만으로 원본을 변경할 수 없고 목록의 조회량을 제한한다", async () => {
    expect(
      (
        await gql(
          "mutation($input: StartWalkInput!) { startWalk(input: $input) { id } }",
          { input: { requestId: randomUUID(), petIds: [1] } },
          "viewer",
          [],
          ["challenge:read"],
        )
      ).errors[0].extensions.code,
    ).toBe("FORBIDDEN");
    expect((await gql("{ myWalks(limit: 51) { id } }")).errors).toHaveLength(1);
    expect(
      (
        await gql(
          "{ walkingRoutes(input: {latitude: 37, longitude: 127, radiusMeters: 50000}) { id } }",
        )
      ).errors,
    ).toHaveLength(1);
  });
  it("코스 작성 요청의 동일 재전송은 JSON 저장 순서와 무관하게 같은 코스를 반환한다", async () => {
    const source = await walk("author");
    const input = {
      requestId: randomUUID(),
      walkId: source.id,
      fromIndex: 0,
      toIndex: 30,
      details: {
        title: "다시 보낸 코스",
        description: "소개",
        startPlace: "입구",
        endPlace: "출구",
        tags: [],
      },
    };
    const query =
      "mutation($input: CreateWalkingRouteInput!) { createWalkingRoute(input: $input) { id } }";
    const first = ok(
      await gql(query, { input }, "author"),
      "createWalkingRoute",
    );
    expect(
      ok(await gql(query, { input }, "author"), "createWalkingRoute").id,
    ).toBe(first.id);
    expect(
      (await gql(query, { input: { ...input, fromIndex: 5 } }, "author"))
        .errors,
    ).toHaveLength(1);
  });
  it("사진 확정 도중 탈퇴해도 사진을 되살리지 않고 이미 전송한 파일을 정리한다", async () => {
    const value = await walk();
    const pending = ok(
      await gql(
        "mutation($id: ID!) { beginWalkingPhotoUpload(walkId: $id) { id } }",
        { id: value.id },
      ),
      "beginWalkingPhotoUpload",
    );
    const png = new PNG({ width: 2, height: 2 });
    png.data.fill(255);
    objects.set(`walking/uploads/${pending.id}.png`, PNG.sync.write(png));
    let began!: () => void, release!: () => void;
    const written = new Promise<void>((resolve) => {
      began = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const spy = jest
      .spyOn(storage, "write")
      .mockImplementation(async (key, bytes) => {
        objects.set(key, bytes);
        began();
        await gate;
      });
    const completion = gql(
      "mutation($id: ID!) { completeWalkingPhotoUpload(id: $id) { id } }",
      { id: pending.id },
    );
    try {
      await written;
      expect(
        (
          await request(app.getHttpServer())
            .delete("/challenge/internal/v1/users/viewer")
            .set("authorization", `Bearer ${internalSecret}`)
        ).status,
      ).toBe(204);
    } finally {
      release();
      spy.mockRestore();
    }
    expect((await completion).errors).toHaveLength(1);
    expect(await app.get(DiaryRepository).photo(pending.id)).toBeNull();
    now = new Date(now.getTime() + 7200_000);
    await app.get(MediaCleanupWorker).run();
    expect(objects.size).toBe(0);
  });
  it("사진 저장소 설정 오류는 503으로 구분하고 복구 후 같은 업로드를 확정한다", async () => {
    const value = await walk();
    const pending = ok(
      await gql(
        "mutation($id: ID!) { beginWalkingPhotoUpload(walkId: $id) { id } }",
        { id: value.id },
      ),
      "beginWalkingPhotoUpload",
    );
    const png = new PNG({ width: 2, height: 2 });
    png.data.fill(255);
    objects.set(`walking/uploads/${pending.id}.png`, PNG.sync.write(png));
    const spy = jest
      .spyOn(storage, "read")
      .mockRejectedValueOnce(
        new ServiceUnavailableException("Storage not configured"),
      );
    try {
      const result = await gql(
        "mutation($id: ID!) { completeWalkingPhotoUpload(id: $id) { id } }",
        { id: pending.id },
      );
      expect(result.errors[0].extensions.originalError.statusCode).toBe(503);
    } finally {
      spy.mockRestore();
    }
    expect(
      ok(
        await gql(
          "mutation($id: ID!) { completeWalkingPhotoUpload(id: $id) { status } }",
          { id: pending.id },
        ),
        "completeWalkingPhotoUpload",
      ).status,
    ).toBe("READY");
  });
});
