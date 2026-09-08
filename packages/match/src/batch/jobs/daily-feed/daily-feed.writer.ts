import { type ItemWriter } from "#app/batch/interface/writer";
import { EntityManager } from "@core/database/mikro";
import { YYYYMMDD } from "@core/util";
import { type Candidate } from "./daily-feed.processor.js";

export class DailyFeedWriter implements ItemWriter<Candidate> {
    constructor(
      private readonly em: EntityManager,
      private readonly date: YYYYMMDD,
      private readonly slot: 1 | 2 | 3,
      private readonly slotExpiresAt: Date
    ) {}

    async write(items: Candidate[]): Promise<void> {
      if (items.length === 0) return;
  
      // 중복 viewer 제거
      const viewers = [...new Set(items.map((i) => i.viewerId))].sort();
      const dateStr = this.date.toString(); // ★ 반드시 문자열로
  
      await this.em.transactional(async (manager) => {
        const now = new Date();

        const feedValues = viewers.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
        const feedParameters = viewers.flatMap(viewerId => [
          viewerId,
          dateStr,
          this.slot,
          this.slotExpiresAt,
          now,
          now,
        ]);
        const feeds = await manager.getConnection().execute(
          `INSERT INTO feed (user_id, date, slot, expires_at, created_at, updated_at)
           VALUES ${feedValues}
           ON CONFLICT (user_id, date, slot)
           DO UPDATE SET updated_at = EXCLUDED.updated_at
           RETURNING id, user_id AS "userId"`,
          feedParameters,
        ) as Array<{ id: number; userId: string }>;

        const feedMap = new Map(feeds.map(row => [row.userId, row.id]));
  
        // 3) feed_item 벌크 rows
        const rows: Array<{
          feedId: number;
          targetUserId: string;
          state: number;
          createdAt: Date;
          updatedAt: Date;
        }> = [];
        for (const item of items) {
          const feedId = feedMap.get(item.viewerId);
          if (!feedId) continue;
  
          const push = (targetUserId?: string) => {
            if (!targetUserId) return;
            rows.push({
              feedId,
              targetUserId,
              state: 1,
              createdAt: now,
              updatedAt: now,
            });
          };
  
          push(item.targets[0]);
          push(item.targets[1]);
        }
  
        if (rows.length === 0) return;
  
        // 4) 벌크 insert (UNIQUE(feed_id, target_user_id) 중복 무시)
        const BATCH_SIZE = 1000;
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const batch = rows.slice(i, i + BATCH_SIZE);
          const values = batch.map(() => '(?, ?, ?, ?, ?)').join(', ');
          const parameters = batch.flatMap(row => [
            row.feedId,
            row.targetUserId,
            row.state,
            row.createdAt,
            row.updatedAt,
          ]);
          await manager.getConnection().execute(
            `INSERT INTO feed_item (feed_id, target_user_id, state, created_at, updated_at)
             VALUES ${values}
             ON CONFLICT (feed_id, target_user_id) DO NOTHING`,
            parameters,
          );
        }
      });
    }
  }
