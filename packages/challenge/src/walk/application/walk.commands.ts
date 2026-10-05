import { isDeepStrictEqual } from "node:util";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { UserPrincipal } from "@core/auth";
import { ulid } from "ulid";
import { ChallengeTransaction } from "../../shared/application/challenge-transaction.js";
import { ChallengeClock } from "../../shared/application/challenge-clock.js";
import { ChallengeRepository } from "../../shared/application/challenge.repository.js";
import { WalkingAccountPort } from "../../shared/application/walking-account.port.js";
import {
  activeUser,
  requestId,
} from "../../shared/application/content-validation.js";
import { RouteRepository } from "../../route/application/route.repository.js";
import { ActivityCommands } from "../../activity/application/activity.commands.js";
import { DiaryCommands } from "../../diary/application/diary.commands.js";
import { WalkRepository } from "./walk.repository.js";
import type { WalkingRecord } from "../domain/walking-record.js";
import {
  assessWalk,
  MAX_TRACK_POINTS,
  MAX_WALK_MS,
  validCoordinate,
  WALK_POLICY_VERSION,
  type TrackPoint,
} from "../domain/geometry.js";

@Injectable()
export class WalkCommands {
  constructor(
    private readonly transaction: ChallengeTransaction,
    private readonly walks: WalkRepository,
    private readonly routes: RouteRepository,
    private readonly challenges: ChallengeRepository,
    private readonly clock: ChallengeClock,
    private readonly account: WalkingAccountPort,
    private readonly activity: ActivityCommands,
    private readonly diaries: DiaryCommands,
  ) {}

  async start(
    user: UserPrincipal,
    key: string,
    petIds: number[],
    routeId: string | null,
  ): Promise<string> {
    requestId(key);
    if (
      !Array.isArray(petIds) ||
      petIds.length < 1 ||
      petIds.length > 6 ||
      new Set(petIds).size !== petIds.length ||
      petIds.some((id) => !Number.isSafeInteger(id) || id < 1)
    )
      throw new BadRequestException(
        "함께 산책할 반려견을 1~6마리 선택해 주세요.",
      );
    // Idempotent retries still work while Account is temporarily unavailable.
    const replay = await this.walks.byRequest(user.userId, key);
    const checkReplay = (old: WalkingRecord) => {
      if (
        old.state === "DELETED" ||
        old.route?.id !== (routeId ?? undefined) ||
        old.pets
          .map((p) => p.id)
          .sort((a, b) => a - b)
          .join() !== [...petIds].sort((a, b) => a - b).join()
      )
        throw new ConflictException(
          "다른 산책에 사용했거나 삭제한 시작 요청입니다.",
        );
      return old.id;
    };
    if (replay) return checkReplay(replay);
    const owner = await this.account.owner(user);
    const pets = petIds.map((id) => owner.pets.find((p) => p.id === id));
    if (pets.some((p) => !p))
      throw new BadRequestException(
        "본인이 등록한 반려견만 선택할 수 있습니다.",
      );
    return this.transaction.run(user.userId, async () => {
      await activeUser(this.challenges, user.userId);
      const old = await this.walks.byRequest(user.userId, key);
      if (old) return checkReplay(old);
      if (await this.walks.current(user.userId))
        throw new ConflictException(
          "진행 중인 산책을 먼저 종료하거나 삭제해 주세요.",
        );
      const route = routeId ? await this.routes.find(routeId) : null;
      if (routeId && route?.status !== "PUBLISHED")
        throw new NotFoundException("현재 이용할 수 없는 코스입니다.");
      const now = this.clock.now(),
        id = ulid();
      await this.walks.save({
        id,
        userId: user.userId,
        requestId: key,
        state: "RECORDING",
        authorName: owner.nickname,
        pets: pets.map((p) => ({ id: p!.id, name: p!.name })),
        routeId: route?.id ?? null,
        route: route
          ? {
              id: route.id,
              title: route.title,
              authorId: route.userId,
              path: route.path,
            }
          : null,
        points: [],
        segments: [{ startedAt: now.toISOString(), endedAt: null }],
        startedAt: now,
        endedAt: null,
        finishedAt: null,
        distanceMeters: 0,
        coverage: 0,
        completed: false,
        revision: 1,
        policyVersion: WALK_POLICY_VERSION,
      });
      return id;
    });
  }
  private async owned(userId: string, id: string) {
    const walk = await this.walks.find(id);
    if (!walk || walk.userId !== userId || walk.state === "DELETED")
      throw new NotFoundException("산책 기록이 없습니다.");
    return walk;
  }
  async append(
    userId: string,
    id: string,
    fromIndex: number,
    input: TrackPoint[],
  ): Promise<void> {
    if (
      !Number.isInteger(fromIndex) ||
      fromIndex < 0 ||
      !Array.isArray(input) ||
      !input.length ||
      input.length > 200
    )
      throw new BadRequestException(
        "좌표 시작 순서와 1~200개 배치를 확인해 주세요.",
      );
    await this.transaction.run(userId, async () => {
      const walk = await this.owned(userId, id),
        now = this.clock.now();
      const points = input.map((p) => {
        const time = Date.parse(p.recordedAt);
        if (
          !validCoordinate(p) ||
          !/(Z|[+-]\d{2}:\d{2})$/.test(p.recordedAt) ||
          !Number.isFinite(time) ||
          time < walk.startedAt!.getTime() ||
          time > now.getTime() ||
          time > walk.startedAt!.getTime() + MAX_WALK_MS ||
          !Number.isFinite(p.accuracyMeters) ||
          p.accuracyMeters < 0 ||
          p.accuracyMeters > 5000 ||
          !Number.isInteger(p.segment) ||
          p.segment < 0 ||
          p.segment >= walk.segments.length
        )
          throw new BadRequestException(
            "좌표·정확도·수집 시각·기록 구간을 확인해 주세요.",
          );
        const segment = walk.segments[p.segment];
        if (
          time < Date.parse(segment.startedAt) ||
          (segment.endedAt && time > Date.parse(segment.endedAt))
        )
          throw new BadRequestException(
            "일시정지 중 수집한 좌표는 전송할 수 없습니다.",
          );
        return {
          latitude: p.latitude,
          longitude: p.longitude,
          recordedAt: new Date(time).toISOString(),
          accuracyMeters: p.accuracyMeters,
          segment: p.segment,
        };
      });
      if (fromIndex < walk.points.length) {
        if (
          isDeepStrictEqual(
            walk.points.slice(fromIndex, fromIndex + points.length),
            points,
          )
        )
          return;
        throw new ConflictException("이미 저장한 좌표 배치와 내용이 다릅니다.");
      }
      if (walk.state === "FINISHED")
        throw new ConflictException(
          "종료한 산책에는 좌표를 추가할 수 없습니다.",
        );
      if (fromIndex !== walk.points.length)
        throw new ConflictException(
          `다음 좌표 순서는 ${walk.points.length}입니다.`,
        );
      if (walk.points.length + points.length > MAX_TRACK_POINTS)
        throw new BadRequestException("산책당 최대 좌표 수를 초과했습니다.");
      let previous = walk.points.at(-1);
      for (const point of points) {
        if (
          previous &&
          (Date.parse(point.recordedAt) <= Date.parse(previous.recordedAt) ||
            point.segment < previous.segment)
        )
          throw new BadRequestException(
            "좌표는 수집 시각과 기록 구간 순서대로 전송해 주세요.",
          );
        previous = point;
      }
      await this.walks.save({
        ...walk,
        points: [...walk.points, ...points],
        revision: walk.revision + 1,
      });
    });
  }
  async pause(userId: string, id: string, paused: boolean): Promise<void> {
    await this.transaction.run(userId, async () => {
      const walk = await this.owned(userId, id),
        now = this.clock.now();
      if (walk.state === "FINISHED")
        throw new ConflictException("이미 종료한 산책입니다.");
      if ((walk.state === "PAUSED") === paused) return;
      if (now.getTime() > walk.startedAt!.getTime() + MAX_WALK_MS)
        throw new ConflictException("24시간을 넘긴 산책은 종료해 주세요.");
      const segments = walk.segments.map((s) => ({ ...s }));
      if (paused) segments[segments.length - 1].endedAt = now.toISOString();
      else segments.push({ startedAt: now.toISOString(), endedAt: null });
      await this.walks.save({
        ...walk,
        state: paused ? "PAUSED" : "RECORDING",
        segments,
        revision: walk.revision + 1,
      });
    });
  }
  async finish(userId: string, id: string, endedAt: Date): Promise<void> {
    await this.transaction.run(userId, async () => {
      const walk = await this.owned(userId, id),
        now = this.clock.now();
      if (walk.state === "FINISHED") {
        if (walk.endedAt!.getTime() !== endedAt.getTime())
          throw new ConflictException("이미 종료 시각이 확정된 산책입니다.");
        return;
      }
      if (
        !Number.isFinite(endedAt.getTime()) ||
        endedAt < walk.startedAt! ||
        endedAt > now ||
        endedAt.getTime() > walk.startedAt!.getTime() + MAX_WALK_MS ||
        (walk.points.length &&
          endedAt.getTime() < Date.parse(walk.points.at(-1)!.recordedAt)) ||
        endedAt.getTime() <
          Date.parse(
            walk.segments.at(-1)!.endedAt ?? walk.segments.at(-1)!.startedAt,
          )
      )
        throw new BadRequestException("산책 종료 시각을 확인해 주세요.");
      const result = assessWalk(walk.points, walk.route?.path ?? null);
      const segments = walk.segments.map((s) => ({ ...s }));
      if (!segments.at(-1)!.endedAt)
        segments[segments.length - 1].endedAt = endedAt.toISOString();
      const next: WalkingRecord = {
        ...walk,
        ...result,
        segments,
        endedAt,
        finishedAt: now,
        state: "FINISHED",
        revision: walk.revision + 1,
      };
      await this.walks.save(next);
      await this.activity.recordActivity({
        userId,
        kind: "WALK",
        sourceId: id,
        revision: next.revision,
        deleted: false,
        facts: {
          walkId: id,
          walkStartedAt: next.startedAt!.toISOString(),
          walkEndedAt: endedAt.toISOString(),
          distanceMeters: next.distanceMeters,
          routeId: next.route?.id ?? null,
          routeAuthorId: next.route?.authorId ?? null,
          completed: next.completed,
        },
      });
    });
  }
  async remove(userId: string, id: string): Promise<void> {
    await this.transaction.run(userId, async () => {
      const existing = await this.walks.find(id);
      if (existing?.userId === userId && existing.state === "DELETED") return;
      const walk = await this.owned(userId, id);
      await this.diaries.removeForWalk(userId, id);
      await this.routes.deleteByWalk(id);
      await this.walks.save({
        ...walk,
        state: "DELETED",
        points: [],
        segments: [],
        pets: [],
        routeId: null,
        route: null,
        authorName: "",
        startedAt: null,
        endedAt: null,
        finishedAt: null,
        distanceMeters: 0,
        coverage: 0,
        completed: false,
        revision: walk.revision + 1,
      });
      await this.activity.recordActivity({
        userId,
        kind: "WALK",
        sourceId: id,
        revision: walk.revision + 1,
        deleted: true,
        facts: null,
      });
    });
  }
}
