import { FeedItemRepositoryPort } from "@app/feed/domain/port/feed-item.repository.port";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FeedItemEntity } from "@app/feed/domain/model/feed-item";
import { FeedItemOrmEntity } from "@core/database";
import { FeedItemOrmMapper } from "./mapper/feed-item-orm.mapper";

@Injectable()
export class FeedItemOrmRepository implements FeedItemRepositoryPort {

    constructor(
        @InjectRepository(FeedItemOrmEntity)
        private readonly feedItemRepository : Repository<FeedItemOrmEntity>
    ){}

    async getFeedItemFromId(id: number): Promise<FeedItemEntity> {
        const orm = await this.feedItemRepository.findOneBy({ id });
        return FeedItemOrmMapper.toDomain(orm);
    }

    async updateFeedItem(feedItem: FeedItemEntity): Promise<FeedItemEntity> {
        const orm = FeedItemOrmMapper.toOrm(feedItem);
        const updatedFeedItem = await this.feedItemRepository.save(orm);
        return FeedItemOrmMapper.toDomain(updatedFeedItem);
    }
}