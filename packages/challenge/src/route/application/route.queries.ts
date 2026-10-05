import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { page } from "../../shared/application/content-validation.js";
import { validCoordinate } from "../../walk/domain/geometry.js";
import {
  ROUTE_TAGS,
  type RouteSearch,
  type WalkingRoute,
} from "../domain/walking-route.js";
import { RouteRepository } from "./route.repository.js";

@Injectable()
export class RouteQueries {
  constructor(private readonly routes: RouteRepository) {}
  private async view(
    route: WalkingRoute,
    userId: string,
    nearbyMeters: number | null = null,
  ) {
    return {
      id: route.id,
      title: route.title,
      description: route.description,
      startPlace: route.startPlace,
      endPlace: route.endPlace,
      authorName: route.authorName,
      petNames: route.petNames,
      path: route.path,
      tags: route.tags,
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      isLoop: route.isLoop,
      nearbyMeters,
      isMine: route.userId === userId,
      bookmarked: await this.routes.isBookmarked(userId, route.id),
      walkerCount: await this.routes.completionCount(route.id),
    };
  }
  async published(id: string, userId: string) {
    const route = await this.routes.find(id);
    if (!route || route.status !== "PUBLISHED")
      throw new NotFoundException("현재 공개한 코스가 없습니다.");
    return this.view(route, userId);
  }
  async own(id: string, userId: string) {
    const route = await this.routes.find(id);
    if (!route || route.userId !== userId)
      throw new NotFoundException("내 코스가 아닙니다.");
    return {
      ...(await this.view(route, userId)),
      sourceWalkId: route.sourceWalkId,
      status: route.status,
      reviewReason: route.reviewReason,
      revision: route.revision,
    };
  }
  async search(userId: string, input: RouteSearch) {
    page(input.limit, input.offset);
    if (
      !validCoordinate(input) ||
      !Number.isInteger(input.radiusMeters) ||
      input.radiusMeters < 100 ||
      input.radiusMeters > 20_000 ||
      !Array.isArray(input.tags) ||
      input.tags.length > ROUTE_TAGS.length ||
      input.tags.some((t) => !(ROUTE_TAGS as readonly string[]).includes(t)) ||
      [input.minDistanceMeters, input.maxDistanceMeters].some(
        (n) => n !== undefined && (!Number.isInteger(n) || n < 0 || n > 50_000),
      ) ||
      (input.minDistanceMeters !== undefined &&
        input.maxDistanceMeters !== undefined &&
        input.minDistanceMeters > input.maxDistanceMeters)
    )
      throw new BadRequestException(
        "지역 좌표·검색 반경·거리·특징을 확인해 주세요.",
      );
    return Promise.all(
      (await this.routes.search(input)).map((row) =>
        this.view(row.route, userId, row.nearbyMeters),
      ),
    );
  }
  async ownList(userId: string, limit: number, offset: number) {
    page(limit, offset);
    return Promise.all(
      (await this.routes.listOwn(userId, limit, offset)).map(async (route) => ({
        ...(await this.view(route, userId)),
        sourceWalkId: route.sourceWalkId,
        status: route.status,
        reviewReason: route.reviewReason,
        revision: route.revision,
      })),
    );
  }
  async bookmarks(userId: string, limit: number, offset: number) {
    page(limit, offset);
    return Promise.all(
      (await this.routes.bookmarks(userId, limit, offset)).map((r) =>
        this.view(r, userId),
      ),
    );
  }
  async reviewItem(id: string) {
    const route = await this.routes.find(id);
    if (!route) throw new NotFoundException("코스가 없습니다.");
    return route;
  }
  async pending(limit: number, offset: number) {
    page(limit, offset);
    return this.routes.listStatus("PENDING", limit, offset);
  }
  async reports(limit: number, offset: number) {
    page(limit, offset);
    return this.routes.reports(limit, offset);
  }
}
