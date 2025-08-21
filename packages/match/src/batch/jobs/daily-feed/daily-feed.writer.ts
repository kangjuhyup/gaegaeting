import { ItemWriter } from "@app/batch/interface/writer";
import { FeedOrmEntity, FeedItemOrmEntity } from "@core/database";
import { YYYYMMDD } from "@core/util";
import { EntityManager } from "typeorm";
import { Candidate } from "./daily-feed.processor";

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
  
      await this.em.transaction(async (manager) => {
        const now = new Date();
  
        // 1) feed upsert (프로퍼티명 기준 orUpdate 권장)
        await manager
          .createQueryBuilder()
          .insert()
          .into(FeedOrmEntity)
          .values(
            viewers.map((viewerId) => ({
              userId: viewerId,
              date: dateStr,
              slot: this.slot,
              createdAt: now,
              updatedAt: now,
            })),
          )
          .orUpdate(['updated_at'], ['userId', 'date', 'slot'])
          .execute();
  
        // 2) upsert된 feed id 조회 — 파라미터를 문자열/프리미티브로!
        const feeds = await manager
          .getRepository(FeedOrmEntity)
          .createQueryBuilder('feed')
          .where('feed.user_id IN (:...viewers)', { viewers })
          .andWhere('feed.date = :date', { date: dateStr }) // ★ 문자열로 바인딩
          .andWhere('feed.slot = :slot', { slot: this.slot })
          .getMany();
  
        const feedMap = new Map(feeds.map((r) => [r.userId, r.id]));
  
        // 3) feed_item 벌크 rows
        const rows: Array<Partial<FeedItemOrmEntity>> = [];
        for (const item of items) {
          const feedId = feedMap.get(item.viewerId);
          if (!feedId) continue;
  
          const push = (targetUserId?: string) => {
            if (!targetUserId) return;
            rows.push({
              feedId,
              targetUserId,
              state: 1,
              expiresAt: this.slotExpiresAt,
              createdAt: now,
              updatedAt: now,
            });
          };
  
          push(item.targets[0]);
          push(item.targets[1]);
        }
  
        if (rows.length === 0) return;
  
        // 4) 벌크 insert (UNIQUE(feed_id, target_user_id) 있으면 .orIgnore()로 중복 무시)
        const BATCH_SIZE = 1000;
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          await manager
            .createQueryBuilder()
            .insert()
            .into(FeedItemOrmEntity)
            .values(rows.slice(i, i + BATCH_SIZE))
            .orIgnore()
            .execute();
        }
      });
    }
  }
  