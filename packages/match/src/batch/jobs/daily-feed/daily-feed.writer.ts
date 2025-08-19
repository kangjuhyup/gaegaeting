import { ItemWriter } from "@app/batch/interface/writer";
import { Candidate } from "./daily-feed.processor";
import { DataSource } from "typeorm";
import { FeedItemOrmEntity, FeedOrmEntity } from "@core/database";

export class DailyFeedWriter implements ItemWriter<Candidate> {

    constructor(
        private readonly ds : DataSource,
        private readonly date : string,
        private readonly slot : 1|2|3,
        private readonly slotExpiresAt : Date
    ) {}

    async write(items: Candidate[]): Promise<void> {
        if(items.length === 0) return;
        
        const viewers = [...new Set(items.map(item => item.viewerId))].sort();

        await this.ds.transaction(async (manager) => {
            const now = () => 'NOW()';
            await manager.createQueryBuilder()
                .insert()
                .into(FeedOrmEntity)
                .values(items.map(item => ({
                    userId : item.viewerId,
                    date : this.date,
                    slot : this.slot,
                    createdAt : now(),
                    updatedAt : now(),
                })))
                .orUpdate(['updatedAt'], ['user_id', 'date', 'slot'])
                .execute();

            const feeds = await manager.getRepository(FeedOrmEntity)
                .createQueryBuilder('feed')
                .where('feed.user_id IN (:...viewers)', { viewers })
                .andWhere('feed.date = :date', { date : this.date })
                .andWhere('feed.slot = :slot', { slot : this.slot })
                .getMany();

            const feedMap = new Map(feeds.map((r) => [r.userId, r.id]));

            const rows : Array<Partial<FeedItemOrmEntity>> = [];
            for(const item of items) {
                const feedId = feedMap.get(item.viewerId);
                if(!feedId) continue;
                rows.push({
                    feedId,
                    targetUserId : item.targets[0],
                    state : 1,
                    expiresAt : this.slotExpiresAt,
                });
                if(item.targets.length > 1) {
                    rows.push({
                        feedId,
                        targetUserId : item.targets[1],
                        state : 1,
                        expiresAt : this.slotExpiresAt,
                    });
                }
            }

            if(rows.length === 0) return;

            const BATCH_SIZE = 1000;

            for(let i =0; i<rows.length; i += BATCH_SIZE) {
                await manager.createQueryBuilder()
                .insert()
                .into(FeedItemOrmEntity)
                .values(rows.slice(i, i + BATCH_SIZE))
                .orIgnore()
                .execute();
            }
        })
    }

}