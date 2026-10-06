import type { WalkingRecord } from "../domain/walking-record.js";
export abstract class WalkRepository {
  abstract find(id: string): Promise<WalkingRecord | null>;
  abstract byRequest(
    userId: string,
    requestId: string,
  ): Promise<WalkingRecord | null>;
  abstract current(userId: string): Promise<WalkingRecord | null>;
  abstract list(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<WalkingRecord[]>;
  abstract save(walk: WalkingRecord): Promise<void>;
  abstract deleteForUser(userId: string): Promise<void>;
  abstract passport(
    userId: string,
  ): Promise<{ routeId: string; title: string; completedCount: number }[]>;
}
