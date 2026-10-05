import type { Coordinate, TrackPoint } from "./geometry.js";
export interface WalkingPet {
  id: number;
  name: string;
}
export interface RouteSnapshot {
  id: string;
  authorId: string;
  title: string;
  path: Coordinate[];
}
export interface WalkSegment {
  startedAt: string;
  endedAt: string | null;
}
export interface WalkingRecord {
  id: string;
  userId: string;
  requestId: string;
  state: "RECORDING" | "PAUSED" | "FINISHED" | "DELETED";
  authorName: string;
  pets: WalkingPet[];
  routeId: string | null;
  route: RouteSnapshot | null;
  points: TrackPoint[];
  segments: WalkSegment[];
  startedAt: Date | null;
  endedAt: Date | null;
  finishedAt: Date | null;
  distanceMeters: number;
  coverage: number;
  completed: boolean;
  revision: number;
  policyVersion: number;
}
