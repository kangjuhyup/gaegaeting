import { FeedEntity } from "#app/feed/domain/model/feed";
import { FeedRepositoryPort } from "#app/feed/domain/port/feed.repository.port";
import { EntityManager, FeedOrmEntity } from "@core/database/mikro";
import { YYYYMMDD } from "@core/util";
import { Injectable } from "@nestjs/common";
import { FeedOrmMapper } from "./mapper/feed-orm.mapper.js";

@Injectable()
export class FeedOrmRepository implements FeedRepositoryPort {

    constructor(private readonly entityManager: EntityManager) {}

    async getMyFeedWithItems(userId: string, date: YYYYMMDD): Promise<FeedEntity[]> {
        const orm = await this.entityManager.find(
            FeedOrmEntity,
            { userId, date: date.toString() },
            { populate: ['items'] },
        )
        return orm.map(FeedOrmMapper.toDomain);
    }

    async saveFeed(feed: FeedEntity): Promise<FeedEntity> {
        const orm = FeedOrmMapper.toOrm(feed);
        const savedFeed = await this.entityManager.upsert(FeedOrmEntity, orm);
        return FeedOrmMapper.toDomain(savedFeed);
    }

}
