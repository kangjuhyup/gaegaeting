import type {
  RouteReport,
  RouteSearch,
  RouteStatus,
  WalkingRoute,
} from "../domain/walking-route.js";
export abstract class RouteRepository {
  abstract find(id: string): Promise<WalkingRoute | null>;
  abstract byRequest(
    userId: string,
    requestId: string,
  ): Promise<WalkingRoute | null>;
  abstract save(route: WalkingRoute): Promise<void>;
  abstract search(
    search: RouteSearch,
  ): Promise<{ route: WalkingRoute; nearbyMeters: number }[]>;
  abstract listOwn(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<WalkingRoute[]>;
  abstract listStatus(
    status: RouteStatus,
    limit: number,
    offset: number,
  ): Promise<WalkingRoute[]>;
  abstract completionCount(routeId: string): Promise<number>;
  abstract bookmark(
    userId: string,
    routeId: string,
    save: boolean,
    now: Date,
  ): Promise<void>;
  abstract bookmarks(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<WalkingRoute[]>;
  abstract isBookmarked(userId: string, routeId: string): Promise<boolean>;
  abstract report(value: RouteReport): Promise<void>;
  abstract reports(limit: number, offset: number): Promise<RouteReport[]>;
  abstract resolveReports(routeId: string): Promise<void>;
  abstract deleteByWalk(walkId: string): Promise<void>;
  abstract deleteForUser(userId: string): Promise<void>;
}
