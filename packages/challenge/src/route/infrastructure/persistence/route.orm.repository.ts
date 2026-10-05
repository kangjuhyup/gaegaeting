import { Injectable } from "@nestjs/common";
import { ChallengeSession } from "../../../shared/infrastructure/persistence/challenge-session.js";
import { RouteRepository } from "../../application/route.repository.js";
import type {
  WalkingRoute,
  RouteSearch,
  RouteStatus,
  RouteReport,
} from "../../domain/walking-route.js";
import { WalkingRouteEntity } from "./walking-route.entity.js";
import { RouteBookmarkEntity } from "./route-bookmark.entity.js";
import { RouteReportEntity } from "./route-report.entity.js";

@Injectable()
export class RouteOrmRepository extends RouteRepository {
  constructor(private readonly session: ChallengeSession) {
    super();
  }
  async find(id: string): Promise<WalkingRoute | null> {
    const row = await this.session.em.findOne(WalkingRouteEntity, { id });
    return row ? { ...row } : null;
  }
  async byRequest(
    userId: string,
    requestId: string,
  ): Promise<WalkingRoute | null> {
    const row = await this.session.em.findOne(WalkingRouteEntity, {
      userId,
      requestId,
    });
    return row ? { ...row } : null;
  }
  async save(value: WalkingRoute) {
    await this.session.em.upsert(WalkingRouteEntity, value);
  }
  async search(
    input: RouteSearch,
  ): Promise<{ route: WalkingRoute; nearbyMeters: number }[]> {
    const clauses = ["status = 'PUBLISHED'"],
      values: unknown[] = [input.latitude, input.latitude, input.longitude];
    if (input.isLoop !== undefined) {
      clauses.push("is_loop = ?");
      values.push(input.isLoop);
    }
    if (input.minDistanceMeters !== undefined) {
      clauses.push("distance_meters >= ?");
      values.push(input.minDistanceMeters);
    }
    if (input.maxDistanceMeters !== undefined) {
      clauses.push("distance_meters <= ?");
      values.push(input.maxDistanceMeters);
    }
    if (input.tags.length) {
      clauses.push("tags @> ?::jsonb");
      values.push(JSON.stringify(input.tags));
    }
    const rows = await this.session.query<{ id: string; meters: number }>(
      `SELECT id, meters FROM (SELECT id, 6371000 * acos(least(1.0, greatest(-1.0,
         sin(radians(?::float8)) * sin(radians(start_latitude)) +
         cos(radians(?::float8)) * cos(radians(start_latitude)) * cos(radians(start_longitude - ?::float8))))) AS meters
       FROM walking_route WHERE ${clauses.join(" AND ")}) nearby
       WHERE meters <= ? ORDER BY meters ASC, id ASC LIMIT ? OFFSET ?`,
      [...values, input.radiusMeters, input.limit, input.offset],
    );
    if (!rows.length) return [];
    const found = await this.session.em.find(WalkingRouteEntity, {
      id: { $in: rows.map((row) => row.id) },
      status: "PUBLISHED",
    });
    const byId = new Map(found.map((row) => [row.id, row]));
    return rows.flatMap((row) => {
      const route = byId.get(row.id);
      return route
        ? [{ route: { ...route }, nearbyMeters: Math.round(row.meters) }]
        : [];
    });
  }
  async listOwn(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<WalkingRoute[]> {
    return (
      await this.session.em.find(
        WalkingRouteEntity,
        { userId },
        { limit, offset, orderBy: { createdAt: "DESC", id: "DESC" } },
      )
    ).map((row) => ({ ...row }));
  }
  async listStatus(
    status: RouteStatus,
    limit: number,
    offset: number,
  ): Promise<WalkingRoute[]> {
    return (
      await this.session.em.find(
        WalkingRouteEntity,
        { status },
        { limit, offset, orderBy: { updatedAt: "ASC", id: "ASC" } },
      )
    ).map((row) => ({ ...row }));
  }
  async completionCount(routeId: string) {
    const rows = await this.session.query<{ count: string }>(
      `SELECT count(DISTINCT w.user_id) AS count FROM walking_record w
      JOIN walking_route r ON r.id = w.route_id WHERE w.route_id = ? AND w.state = 'FINISHED' AND w.completed = true AND w.user_id <> r.user_id`,
      [routeId],
    );
    return Number(rows[0]?.count ?? 0);
  }
  async bookmark(userId: string, routeId: string, save: boolean, now: Date) {
    if (save)
      await this.session.em.upsert(RouteBookmarkEntity, {
        userId,
        routeId,
        createdAt: now,
      });
    else
      await this.session.em.nativeDelete(RouteBookmarkEntity, {
        userId,
        routeId,
      });
  }
  async bookmarks(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<WalkingRoute[]> {
    const rows = await this.session.query<{ id: string }>(
      `SELECT r.id FROM walking_route r JOIN walking_route_bookmark b ON b.route_id = r.id
      WHERE b.user_id = ? AND r.status = 'PUBLISHED' ORDER BY b.created_at DESC, r.id DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset],
    );
    if (!rows.length) return [];
    const routes = await this.session.em.find(WalkingRouteEntity, {
      id: { $in: rows.map((row) => row.id) },
      status: "PUBLISHED",
    });
    return rows.flatMap((row) => {
      const route = routes.find((r) => r.id === row.id);
      return route ? [{ ...route }] : [];
    });
  }
  async isBookmarked(userId: string, routeId: string) {
    return (
      (await this.session.em.count(RouteBookmarkEntity, { userId, routeId })) >
      0
    );
  }
  async report(value: RouteReport) {
    const old = await this.session.em.findOne(RouteReportEntity, {
      userId: value.userId,
      routeId: value.routeId,
    });
    await this.session.em.upsert(RouteReportEntity, {
      ...value,
      id: old?.id ?? value.id,
    });
  }
  async reports(limit: number, offset: number): Promise<RouteReport[]> {
    return (
      await this.session.em.find(
        RouteReportEntity,
        { resolved: false },
        { limit, offset, orderBy: { createdAt: "ASC", id: "ASC" } },
      )
    ).map((row) => ({ ...row }));
  }
  async resolveReports(routeId: string) {
    await this.session.em.nativeUpdate(
      RouteReportEntity,
      { routeId },
      { resolved: true },
    );
  }
  async deleteByWalk(sourceWalkId: string) {
    await this.session.em.nativeDelete(WalkingRouteEntity, { sourceWalkId });
  }
  async deleteForUser(userId: string) {
    await this.session.em.nativeDelete(RouteBookmarkEntity, { userId });
    await this.session.em.nativeDelete(RouteReportEntity, { userId });
    await this.session.em.nativeDelete(WalkingRouteEntity, { userId });
  }
}
