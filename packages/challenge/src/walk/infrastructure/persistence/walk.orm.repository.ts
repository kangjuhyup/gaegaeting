import { Injectable } from "@nestjs/common";
import { ChallengeSession } from "../../../shared/infrastructure/persistence/challenge-session.js";
import { WalkRepository } from "../../application/walk.repository.js";
import type { WalkingRecord } from "../../domain/walking-record.js";
import { WalkingRecordEntity } from "./walking-record.entity.js";

@Injectable()
export class WalkOrmRepository extends WalkRepository {
  constructor(private readonly session: ChallengeSession) {
    super();
  }
  async find(id: string): Promise<WalkingRecord | null> {
    const row = await this.session.em.findOne(WalkingRecordEntity, { id });
    return row ? { ...row } : null;
  }
  async byRequest(
    userId: string,
    requestId: string,
  ): Promise<WalkingRecord | null> {
    const row = await this.session.em.findOne(WalkingRecordEntity, {
      userId,
      requestId,
    });
    return row ? { ...row } : null;
  }
  async current(userId: string): Promise<WalkingRecord | null> {
    const row = await this.session.em.findOne(WalkingRecordEntity, {
      userId,
      state: { $in: ["RECORDING", "PAUSED"] },
    });
    return row ? { ...row } : null;
  }
  async list(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<WalkingRecord[]> {
    return (
      await this.session.em.find(
        WalkingRecordEntity,
        { userId, state: { $ne: "DELETED" } },
        { limit, offset, orderBy: { startedAt: "DESC", id: "DESC" } },
      )
    ).map((row) => ({ ...row }));
  }
  async save(value: WalkingRecord) {
    await this.session.em.upsert(WalkingRecordEntity, value);
  }
  async deleteForUser(userId: string) {
    await this.session.em.nativeDelete(WalkingRecordEntity, { userId });
  }
  async passport(userId: string) {
    const rows = await this.session.query<{
      route_id: string;
      title: string;
      count: string;
    }>(
      `SELECT route->>'id' AS route_id, max(route->>'title') AS title, count(*) AS count
       FROM walking_record WHERE user_id = ? AND state = 'FINISHED' AND completed = true AND route IS NOT NULL
       GROUP BY route->>'id' ORDER BY max(ended_at) DESC LIMIT 100`,
      [userId],
    );
    return rows.map((row) => ({
      routeId: row.route_id,
      title: row.title,
      completedCount: Number(row.count),
    }));
  }
}
