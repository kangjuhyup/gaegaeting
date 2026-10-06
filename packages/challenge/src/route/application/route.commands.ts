import { isDeepStrictEqual } from "node:util";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ulid } from "ulid";
import { ChallengeTransaction } from "../../shared/application/challenge-transaction.js";
import { ChallengeClock } from "../../shared/application/challenge-clock.js";
import { ChallengeRepository } from "../../shared/application/challenge.repository.js";
import {
  activeUser,
  requestId,
  textField,
} from "../../shared/application/content-validation.js";
import { WalkRepository } from "../../walk/application/walk.repository.js";
import {
  distance,
  pathDistance,
  publicPath,
} from "../../walk/domain/geometry.js";
import { ROUTE_TAGS, type WalkingRoute } from "../domain/walking-route.js";
import { RouteRepository } from "./route.repository.js";

export interface RouteDetails {
  title: string;
  description: string;
  startPlace: string;
  endPlace: string;
  tags: string[];
}
function details(input: RouteDetails): RouteDetails {
  if (
    !Array.isArray(input.tags) ||
    input.tags.length > ROUTE_TAGS.length ||
    new Set(input.tags).size !== input.tags.length ||
    input.tags.some((tag) => !(ROUTE_TAGS as readonly string[]).includes(tag))
  )
    throw new BadRequestException("코스 특징을 확인해 주세요.");
  return {
    title: textField(input.title, 100, true),
    description: textField(input.description, 2000),
    startPlace: textField(input.startPlace, 100, true),
    endPlace: textField(input.endPlace, 100, true),
    tags: [...input.tags].sort((left, right) => left.localeCompare(right, "en")),
  };
}
@Injectable()
export class RouteCommands {
  constructor(
    private readonly transaction: ChallengeTransaction,
    private readonly routes: RouteRepository,
    private readonly walks: WalkRepository,
    private readonly challenges: ChallengeRepository,
    private readonly clock: ChallengeClock,
  ) {}

  async create(
    userId: string,
    key: string,
    walkId: string,
    fromIndex: number,
    toIndex: number,
    input: RouteDetails,
  ): Promise<string> {
    requestId(key);
    const content = details(input);
    return this.transaction.run(userId, async () => {
      await activeUser(this.challenges, userId);
      const walk = await this.walks.find(walkId);
      if (!walk || walk.userId !== userId || walk.state !== "FINISHED")
        throw new NotFoundException(
          "종료한 본인 산책에서 코스를 만들 수 있습니다.",
        );
      let path;
      try {
        path = publicPath(walk.points, fromIndex, toIndex);
      } catch (error) {
        throw new BadRequestException((error as Error).message);
      }
      const previous = await this.routes.byRequest(userId, key);
      if (previous) {
        if (
          previous.sourceWalkId !== walkId ||
          !isDeepStrictEqual(previous.path, path)
        )
          throw new ConflictException("다른 코스에 사용한 요청 식별자입니다.");
        return previous.id;
      }
      const id = ulid(),
        now = this.clock.now();
      await this.routes.save({
        id,
        userId,
        requestId: key,
        sourceWalkId: walkId,
        ...content,
        authorName: walk.authorName,
        petNames: walk.pets.map((p) => p.name),
        path,
        distanceMeters: Math.round(pathDistance(path)),
        durationSeconds: Math.round(
          (Date.parse(walk.points[toIndex].recordedAt) -
            Date.parse(walk.points[fromIndex].recordedAt)) /
            1000,
        ),
        isLoop: distance(path[0], path.at(-1)!) <= 50,
        startLatitude: path[0].latitude,
        startLongitude: path[0].longitude,
        status: "DRAFT",
        reviewReason: null,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      });
      return id;
    });
  }
  private async owned(userId: string, id: string): Promise<WalkingRoute> {
    const value = await this.routes.find(id);
    if (!value || value.userId !== userId)
      throw new NotFoundException("내 코스가 아닙니다.");
    return value;
  }
  async update(
    userId: string,
    id: string,
    revision: number,
    input: RouteDetails,
  ): Promise<void> {
    const content = details(input);
    await this.transaction.run(userId, async () => {
      const route = await this.owned(userId, id);
      if (route.revision !== revision)
        throw new ConflictException(
          "코스가 변경되었습니다. 다시 조회해 주세요.",
        );
      if (["PUBLISHED", "PENDING"].includes(route.status))
        throw new ConflictException(
          "공개 또는 검토 중인 코스는 먼저 공개를 중단해 주세요.",
        );
      await this.routes.save({
        ...route,
        ...content,
        status: "DRAFT",
        reviewReason: null,
        revision: route.revision + 1,
        updatedAt: this.clock.now(),
      });
    });
  }
  async submit(userId: string, id: string): Promise<void> {
    await this.transaction.run(userId, async () => {
      const route = await this.owned(userId, id);
      if (route.status === "PENDING") return;
      if (route.status === "PUBLISHED")
        throw new ConflictException("이미 공개한 코스입니다.");
      await this.routes.save({
        ...route,
        status: "PENDING",
        reviewReason: null,
        revision: route.revision + 1,
        updatedAt: this.clock.now(),
      });
    });
  }
  async withdraw(userId: string, id: string): Promise<void> {
    await this.transaction.run(userId, async () => {
      const route = await this.owned(userId, id);
      if (route.status === "WITHDRAWN") return;
      await this.routes.save({
        ...route,
        status: "WITHDRAWN",
        revision: route.revision + 1,
        updatedAt: this.clock.now(),
      });
    });
  }
  async review(
    id: string,
    revision: number,
    decision: "PUBLISH" | "REJECT" | "WITHDRAW",
    reason: string,
  ): Promise<void> {
    if (!["PUBLISH", "REJECT", "WITHDRAW"].includes(decision))
      throw new BadRequestException("검토 결과가 올바르지 않습니다.");
    const note = textField(reason, 500, decision !== "PUBLISH");
    const before = await this.routes.find(id);
    if (!before) throw new NotFoundException("코스가 없습니다.");
    await this.transaction.run(before.userId, async () => {
      const route = await this.owned(before.userId, id);
      if (route.revision !== revision)
        throw new ConflictException(
          "검토 중 코스가 변경되었습니다. 다시 조회해 주세요.",
        );
      if (decision !== "WITHDRAW" && route.status !== "PENDING")
        throw new ConflictException(
          "검토 대기 중인 코스만 승인·반려할 수 있습니다.",
        );
      await this.routes.save({
        ...route,
        status:
          decision === "PUBLISH"
            ? "PUBLISHED"
            : decision === "REJECT"
              ? "REJECTED"
              : "WITHDRAWN",
        reviewReason: note || null,
        revision: route.revision + 1,
        updatedAt: this.clock.now(),
      });
      if (decision === "WITHDRAW") await this.routes.resolveReports(id);
    });
  }
  async bookmark(userId: string, id: string, save: boolean): Promise<void> {
    await this.transaction.run(userId, async () => {
      await activeUser(this.challenges, userId);
      if (save && (await this.routes.find(id))?.status !== "PUBLISHED")
        throw new NotFoundException("공개한 코스가 없습니다.");
      await this.routes.bookmark(userId, id, save, this.clock.now());
    });
  }
  async report(
    userId: string,
    id: string,
    reason: string,
    detail: string,
  ): Promise<void> {
    if (
      !["UNSAFE", "PET_RESTRICTED", "PRIVACY", "INACCURATE", "OTHER"].includes(
        reason,
      )
    )
      throw new BadRequestException("신고 사유를 선택해 주세요.");
    const note = textField(detail, 500, reason === "OTHER");
    await this.transaction.run(userId, async () => {
      await activeUser(this.challenges, userId);
      if ((await this.routes.find(id))?.status !== "PUBLISHED")
        throw new NotFoundException("공개한 코스가 없습니다.");
      await this.routes.report({
        id: ulid(),
        userId,
        routeId: id,
        reason,
        detail: note,
        resolved: false,
        createdAt: this.clock.now(),
      });
    });
  }
  async resolveReports(id: string): Promise<void> {
    const route = await this.routes.find(id);
    if (!route) throw new NotFoundException("코스가 없습니다.");
    await this.transaction.run(route.userId, () =>
      this.routes.resolveReports(id),
    );
  }
}
