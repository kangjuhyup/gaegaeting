import "reflect-metadata";
import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { EntityManager } from "@core/database/mikro";
import { createInternalAuthAssertion } from "@core/auth-assertion";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { ChallengeClock } from "../src/shared/application/challenge-clock.js";
import {
  ChallengeActivityEntity,
  ChallengeDeletedUserEntity,
  ChallengeEnrollmentEntity,
} from "../src/shared/infrastructure/persistence/challenge.entities.js";
import { runChallengeMigrations } from "../src/migrations/migrate.js";
import { diary, input, walk } from "./fixtures.js";

const integration =
  process.env.CHALLENGE_INTEGRATION_TESTS === "1" ? describe : describe.skip;
const internalSecret =
  "challenge-integration-activity-secret-at-least-32-characters";
const assertionSecret =
  "challenge-integration-user-secret-at-least-32-characters";
const fields =
  "id kind status progressCount targetCount earnedRewardCode joinedAt endsAt settlesAt";

integration("챌린지 독립 서비스의 PostgreSQL 및 인증 API", () => {
  let app: INestApplication;
  let em: EntityManager;
  let now: Date;

  beforeAll(async () => {
    if (
      !["127.0.0.1", "localhost"].includes(process.env.DATABASE_HOST ?? "") ||
      !process.env.DATABASE_NAME?.startsWith("challenge_test_")
    )
      throw new Error("Isolated local challenge_test_ database required");
    Object.assign(process.env, {
      NODE_ENV: "test",
      DATABASE_LOG: "false",
      INTERNAL_AUTH_ASSERTION_SECRET: assertionSecret,
      CHALLENGE_ACTIVITY_SECRET: internalSecret,
    });
    await runChallengeMigrations();
    const { AppModule } = await import("../src/app.module.js");
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ChallengeClock)
      .useValue({ now: () => now })
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
    now = new Date("2026-10-05T09:00:00+09:00");
    await em.nativeDelete(ChallengeActivityEntity, {});
    await em.nativeDelete(ChallengeEnrollmentEntity, {});
    await em.nativeDelete(ChallengeDeletedUserEntity, {});
    em.clear();
  });

  afterAll(async () => {
    await app?.close();
  });

  function assertion(
    userId = "viewer",
    scopes = ["challenge:read", "challenge:write"],
    audience = "challenge",
  ) {
    return createInternalAuthAssertion(
      { userId, tenantId: "test", subject: userId, scopes },
      { secret: assertionSecret, issuer: "gaegaeting-gateway", audience },
    );
  }

  async function gql(
    query: string,
    variables: object = {},
    token: string | null = assertion(),
  ) {
    const operation = request(app.getHttpServer()).post("/challenge/graphql");
    if (token) operation.set("x-gaegaeting-principal", token);
    return (await operation.send({ query, variables })).body;
  }

  async function join(
    kind = "NEIGHBORHOOD_EXPLORER",
    requestId: string = randomUUID(),
    token = assertion(),
  ) {
    return gql(
      `mutation($input: JoinChallengeInput!) { joinChallenge(input: $input) { ${fields} } }`,
      { input: { kind, requestId } },
      token,
    );
  }

  async function progress(id: string) {
    const result = await gql(
      `query($id: ID!) { myChallenge(id: $id) { ${fields} } }`,
      { id },
    );
    expect(result.errors).toBeUndefined();
    return result.data.myChallenge;
  }

  async function record(value: object) {
    return request(app.getHttpServer())
      .put("/challenge/internal/v1/activities")
      .set("authorization", `Bearer ${internalSecret}`)
      .send(value);
  }

  it("인증된 이용자에게 첫 출시의 두 챌린지를 보여준다", async () => {
    const result = await gql(
      "{ challenges { kind durationDays targetCount } }",
    );
    expect(result.errors).toBeUndefined();
    expect(result.data.challenges).toEqual([
      { kind: "NEIGHBORHOOD_EXPLORER", durationDays: 14, targetCount: 3 },
      { kind: "WALK_DIARY", durationDays: 7, targetCount: 3 },
    ]);
  });

  it("인증 누락, 다른 서비스 audience, 부족한 scope를 거절한다", async () => {
    const query = "{ challenges { kind } }";
    expect((await gql(query, {}, null)).errors[0].extensions.code).toBe(
      "UNAUTHENTICATED",
    );
    expect(
      (await gql(query, {}, assertion("viewer", ["challenge:read"], "match")))
        .errors[0].extensions.code,
    ).toBe("UNAUTHENTICATED");
    expect(
      (await gql(query, {}, assertion("viewer", ["match:read"]))).errors[0]
        .extensions.code,
    ).toBe("FORBIDDEN");
    expect(
      (
        await join(
          "WALK_DIARY",
          randomUUID(),
          assertion("viewer", ["challenge:read"]),
        )
      ).errors[0].extensions.code,
    ).toBe("FORBIDDEN");
  });

  it("동일한 참여 요청의 동시 재전송은 참여 하나만 생성한다", async () => {
    const requestId = randomUUID();
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => join("NEIGHBORHOOD_EXPLORER", requestId)),
    );
    for (const response of responses) expect(response.errors).toBeUndefined();
    expect(
      new Set(responses.map((response) => response.data.joinChallenge.id)).size,
    ).toBe(1);
    expect(await em.count(ChallengeEnrollmentEntity, {})).toBe(1);
    expect(responses[0].data.joinChallenge).toMatchObject({
      status: "ACTIVE",
      progressCount: 0,
      endsAt: "2026-10-18T15:00:00.000Z",
      settlesAt: "2026-10-19T15:00:00.000Z",
    });
  });

  it("서로 다른 요청이 동시에 같은 챌린지에 참여해도 하나만 성공한다", async () => {
    const responses = await Promise.all(
      Array.from({ length: 6 }, () => join()),
    );
    expect(responses.filter((response) => !response.errors)).toHaveLength(1);
    expect(await em.count(ChallengeEnrollmentEntity, { isCurrent: true })).toBe(
      1,
    );
  });

  it("참여 요청 식별자를 다른 종류에 재사용할 수 없다", async () => {
    const requestId = randomUUID();
    expect(
      (await join("NEIGHBORHOOD_EXPLORER", requestId)).errors,
    ).toBeUndefined();
    expect((await join("WALK_DIARY", requestId)).errors).toHaveLength(1);
  });

  it("DB도 같은 이용자·종류의 중복 참여를 거절한다", async () => {
    const result = await join();
    const original = await em.findOneOrFail(
      ChallengeEnrollmentEntity,
      result.data.joinChallenge.id,
    );
    const duplicate = {
      ...original,
      id: "01K00000000000000000000002",
      requestId: randomUUID(),
    };
    await expect(
      em.fork().insert(ChallengeEnrollmentEntity, duplicate),
    ).rejects.toThrow();
  });

  it("다른 이용자의 참여 조회와 취소를 거절한다", async () => {
    const id = (await join()).data.joinChallenge.id;
    const other = assertion("other");
    expect(
      (
        await gql(
          `query($id: ID!) { myChallenge(id: $id) { id } }`,
          { id },
          other,
        )
      ).errors,
    ).toHaveLength(1);
    expect(
      (
        await gql(
          "mutation($id: ID!) { cancelChallenge(id: $id) }",
          { id },
          other,
        )
      ).errors,
    ).toHaveLength(1);
    expect(
      (await gql("{ myChallenges { id } }", {}, other)).data.myChallenges,
    ).toEqual([]);
    expect((await progress(id)).status).toBe("ACTIVE");
  });

  it("개수 제한을 넘는 조회와 잘못된 참여 식별자를 거절한다", async () => {
    expect(
      (await gql("{ myChallenges(limit: 51) { id } }")).errors,
    ).toHaveLength(1);
    expect((await join("WALK_DIARY", "not-a-uuid")).errors).toHaveLength(1);
  });

  it("일반 사용자 인증으로는 산책 실적을 만들 수 없다", async () => {
    now = new Date("2026-10-05T12:00:00+09:00");
    const result = await request(app.getHttpServer())
      .put("/challenge/internal/v1/activities")
      .set("x-gaegaeting-principal", assertion())
      .send(input(walk()));
    expect(result.status).toBe(401);
    expect(await em.count(ChallengeActivityEntity, {})).toBe(0);
  });

  it("사진·원본 좌표 등 계약에 없는 필드를 내부 입력에서도 거절한다", async () => {
    now = new Date("2026-10-05T12:00:00+09:00");
    const value = input(walk());
    expect(
      (await record({ ...value, facts: { ...value.facts, latitude: 37.5 } }))
        .status,
    ).toBe(400);
    expect((await record({ ...value, facts: null })).status).toBe(400);
    expect(await em.count(ChallengeActivityEntity, {})).toBe(0);
  });

  it("실적 중복 전송과 같은 코스 반복을 제외하고 세 코스를 완주 처리한다", async () => {
    const id = (await join()).data.joinChallenge.id;
    now = new Date("2026-10-05T12:00:00+09:00");
    const value = input(walk());
    const repeated = await Promise.all([
      record(value),
      record(value),
      record(value),
    ]);
    expect(repeated.map((response) => response.body.result).sort()).toEqual([
      "APPLIED",
      "IGNORED",
      "IGNORED",
    ]);
    expect((await record(input(walk("another-walk", "route-1")))).status).toBe(
      200,
    );
    expect((await progress(id)).progressCount).toBe(1);
    await record(input(walk("second", "route-2")));
    await record(input(walk("third", "route-3")));
    expect(await progress(id)).toMatchObject({
      status: "COMPLETED",
      progressCount: 3,
      earnedRewardCode: "NEIGHBORHOOD_EXPLORER_BADGE",
    });
  });

  it("개인 일기는 공개 여부와 상관없이 날짜별로 집계한다", async () => {
    const id = (await join("WALK_DIARY")).data.joinChallenge.id;
    now = new Date("2026-10-05T12:00:00+09:00");
    await record(input(diary("one")));
    await record(input(diary("same-day")));
    expect((await progress(id)).progressCount).toBe(1);
    now = new Date("2026-10-06T12:00:00+09:00");
    await record(input(diary("two", "2026-10-06")));
    now = new Date("2026-10-07T12:00:00+09:00");
    await record(input(diary("three", "2026-10-07")));
    expect(await progress(id)).toMatchObject({
      status: "COMPLETED",
      earnedRewardCode: "WALK_DIARY_CARD",
    });
  });

  it("일기에서 사진을 제거하면 실적이 취소되고 오래된 이벤트가 되살리지 못한다", async () => {
    const id = (await join("WALK_DIARY")).data.joinChallenge.id;
    now = new Date("2026-10-05T12:00:00+09:00");
    const value = input(diary());
    await record(value);
    await record({
      ...value,
      revision: 2,
      facts: { ...value.facts, hasPhoto: false },
    });
    expect((await progress(id)).progressCount).toBe(0);
    expect((await record(value)).body.result).toBe("IGNORED");
    expect((await progress(id)).progressCount).toBe(0);
  });

  it("조건을 바꾸지 않는 늦은 수정은 최초 인정 시각을 보존한다", async () => {
    const id = (await join("WALK_DIARY")).data.joinChallenge.id;
    now = new Date("2026-10-05T12:00:00+09:00");
    const value = input(diary());
    await record(value);
    now = new Date("2026-10-07T12:00:00+09:00");
    await record({
      ...value,
      revision: 2,
      facts: { ...value.facts, mood: "TIRED" },
    });
    expect((await progress(id)).progressCount).toBe(1);
  });

  it("삭제된 원본 산책에 뒤늦게 도착한 일기는 인정하지 않는다", async () => {
    const id = (await join("WALK_DIARY")).data.joinChallenge.id;
    now = new Date("2026-10-05T12:00:00+09:00");
    const value = diary();
    await record({
      userId: "viewer",
      kind: "WALK",
      sourceId: value.walkId,
      revision: 2,
      deleted: true,
      facts: null,
    });
    await record(input(value));
    expect((await progress(id)).progressCount).toBe(0);
    expect(
      (await record({ ...input(walk(value.walkId!)), revision: 3 })).body
        .result,
    ).toBe("IGNORED");
  });

  it("삭제된 완주 실적은 보상을 회수하며 기록 원문을 지운다", async () => {
    const id = (await join()).data.joinChallenge.id;
    now = new Date("2026-10-05T12:00:00+09:00");
    for (const index of [1, 2, 3])
      await record(input(walk(`walk-${index}`, `route-${index}`)));
    expect((await progress(id)).status).toBe("COMPLETED");
    await record({ ...input(walk()), revision: 2, deleted: true, facts: null });
    expect(await progress(id)).toMatchObject({
      progressCount: 2,
      earnedRewardCode: null,
    });
    const deleted = await em.fork().findOneOrFail(ChallengeActivityEntity, {
      userId: "viewer",
      kind: "WALK",
      sourceId: "walk-1",
    });
    expect(deleted.facts).toBeNull();
    expect(deleted.occurredAt).toBeNull();
  });

  it("취소 후 새로운 요청으로 재참여하고 이전 요청의 재시도는 원래 결과를 돌려준다", async () => {
    const requestId = randomUUID();
    const id = (await join("WALK_DIARY", requestId)).data.joinChallenge.id;
    expect(
      (await gql("mutation($id: ID!) { cancelChallenge(id: $id) }", { id }))
        .data.cancelChallenge,
    ).toBe(true);
    expect(
      (await join("WALK_DIARY", requestId)).data.joinChallenge,
    ).toMatchObject({ id, status: "CANCELLED" });
    const next = await join("WALK_DIARY");
    expect(next.errors).toBeUndefined();
    expect(next.data.joinChallenge.id).not.toBe(id);
  });

  it("동기화 유예가 끝나면 이전 기록을 보존하고 새 기간으로 참여한다", async () => {
    const old = (await join("WALK_DIARY")).data.joinChallenge;
    now = new Date(old.settlesAt);
    const next = await join("WALK_DIARY");
    expect(next.errors).toBeUndefined();
    expect(next.data.joinChallenge.id).not.toBe(old.id);
    expect((await progress(old.id)).status).toBe("EXPIRED");
    expect(await em.count(ChallengeEnrollmentEntity, { isCurrent: true })).toBe(
      1,
    );
  });

  it("마이그레이션 재실행은 참여 데이터를 보존한다", async () => {
    const id = (await join()).data.joinChallenge.id;
    await runChallengeMigrations();
    expect((await progress(id)).id).toBe(id);
  });

  it("사용자 인증이나 잘못된 서버 인증으로는 챌린지 데이터를 삭제할 수 없다", async () => {
    const id = (await join()).data.joinChallenge.id;
    for (const headers of [
      {},
      { "x-gaegaeting-principal": assertion() },
      { authorization: "Bearer wrong-service-secret" },
    ]) {
      const response = await request(app.getHttpServer())
        .delete("/challenge/internal/v1/users/viewer")
        .set(headers);
      expect(response.status).toBe(401);
    }
    expect((await progress(id)).status).toBe("ACTIVE");
    expect(await em.count(ChallengeDeletedUserEntity, {})).toBe(0);
  });

  it("탈퇴 처리 시 해당 이용자의 실적과 참여만 제거한다", async () => {
    await join();
    await join("WALK_DIARY", randomUUID(), assertion("other"));
    now = new Date("2026-10-05T12:00:00+09:00");
    await record(input(walk()));
    expect(
      (
        await request(app.getHttpServer())
          .delete("/challenge/internal/v1/users/viewer")
          .set("authorization", `Bearer ${internalSecret}`)
      ).status,
    ).toBe(204);
    expect(
      await em.count(ChallengeEnrollmentEntity, { userId: "viewer" }),
    ).toBe(0);
    expect(await em.count(ChallengeActivityEntity, { userId: "viewer" })).toBe(
      0,
    );
    expect(await em.count(ChallengeEnrollmentEntity, { userId: "other" })).toBe(
      1,
    );
    expect((await record(input(walk()))).body.result).toBe("IGNORED");
    expect(await em.count(ChallengeActivityEntity, { userId: "viewer" })).toBe(
      0,
    );
    expect((await join()).errors).toHaveLength(1);
  });
});
