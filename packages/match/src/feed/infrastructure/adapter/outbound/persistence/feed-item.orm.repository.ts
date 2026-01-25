import { FeedItemRepositoryPort } from "@app/feed/domain/port/feed-item.repository.port";
import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { FeedItemEntity } from "@app/feed/domain/model/feed-item";
import { FeedItemOrmEntity, BaseRepository } from "@core/database";
import { FeedItemOrmMapper } from "./mapper/feed-item-orm.mapper";

@Injectable()
export class FeedItemOrmRepository extends BaseRepository<FeedItemOrmEntity> implements FeedItemRepositoryPort {

    constructor(dataSource: DataSource) {
        super(FeedItemOrmEntity, dataSource);
    }

    async getFeedItemFromId(id: number): Promise<FeedItemEntity> {
        const orm = await this.getRepository().findOneBy({ id });
        return FeedItemOrmMapper.toDomain(orm);
    }

    async updateFeedItem(feedItem: FeedItemEntity): Promise<FeedItemEntity> {
        const orm = FeedItemOrmMapper.toOrm(feedItem);
        const updatedFeedItem = await this.getRepository().save(orm);
        return FeedItemOrmMapper.toDomain(updatedFeedItem);
    }

    async saveFeedItem(feedItem: FeedItemEntity): Promise<FeedItemEntity> {
        const orm = FeedItemOrmMapper.toOrm(feedItem);
        const savedFeedItem = await this.getRepository().save(orm);
        return FeedItemOrmMapper.toDomain(savedFeedItem);
    }
}