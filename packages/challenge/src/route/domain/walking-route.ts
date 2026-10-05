import type { Coordinate } from "../../walk/domain/geometry.js";
export const ROUTE_TAGS = [
  "DIRT_PATH",
  "NO_STAIRS",
  "SHADE",
  "CROSSWALK",
  "REST_AREA",
] as const;
export type RouteStatus =
  | "DRAFT"
  | "PENDING"
  | "PUBLISHED"
  | "REJECTED"
  | "WITHDRAWN";
export interface WalkingRoute {
  id: string;
  userId: string;
  requestId: string;
  sourceWalkId: string;
  title: string;
  description: string;
  startPlace: string;
  endPlace: string;
  authorName: string;
  petNames: string[];
  path: Coordinate[];
  tags: string[];
  distanceMeters: number;
  durationSeconds: number;
  isLoop: boolean;
  startLatitude: number;
  startLongitude: number;
  status: RouteStatus;
  reviewReason: string | null;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}
export interface RouteSearch {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  limit: number;
  offset: number;
  tags: string[];
  isLoop?: boolean;
  minDistanceMeters?: number;
  maxDistanceMeters?: number;
}
export interface RouteReport {
  id: string;
  userId: string;
  routeId: string;
  reason: string;
  detail: string;
  resolved: boolean;
  createdAt: Date;
}
