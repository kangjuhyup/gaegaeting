import { FeedItemRepositoryPort } from "#app/feed/domain/port/feed-item.repository.port";
import { Injectable } from "@nestjs/common";
import { FeedItemEntity } from "#app/feed/domain/model/feed-item";
import { EntityManager, FeedItemOrmEntity } from "@core/database/mikro";
import { FeedItemOrmMapper } from "./mapper/feed-item-orm.mapper.js";

@Injectable()
export class FeedItemOrmRepository implements FeedItemRepositoryPort {

    constructor(private readonly entityManager: EntityManager) {}

    async getFeedItemFromId(id: number): Promise<FeedItemEntity> {
        const orm = await this.entityManager.findOne(FeedItemOrmEntity, { id });
        return FeedItemOrmMapper.toDomain(orm);
    }

    async updateFeedItem(feedItem: FeedItemEntity): Promise<FeedItemEntity> {
        const orm = FeedItemOrmMapper.toOrm(feedItem);
        const updatedFeedItem = await this.entityManager.upsert(FeedItemOrmEntity, orm);
        return FeedItemOrmMapper.toDomain(updatedFeedItem);
    }

    async saveFeedItem(feedItem: FeedItemEntity): Promise<FeedItemEntity> {
        const orm = FeedItemOrmMapper.toOrm(feedItem);
        const savedFeedItem = await this.entityManager.upsert(FeedItemOrmEntity, orm);
        return FeedItemOrmMapper.toDomain(savedFeedItem);
    }
}
