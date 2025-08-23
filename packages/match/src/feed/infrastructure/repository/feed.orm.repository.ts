import { FeedEntity } from "@app/feed/domain/model/feed";
import { FeedRepositoryPort } from "@app/feed/domain/port/feed.repository.port";
import { FeedOrmEntity } from "@core/database";
import { YYYYMMDD } from "@core/util";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FeedOrmMapper } from "./mapper/feed-orm.mapper";

@Injectable()
export class FeedOrmRepository implements FeedRepositoryPort {

    constructor(
        @InjectRepository(FeedOrmEntity)
        private readonly feedRepository : Repository<FeedOrmEntity>
    ){}

    async getMyFeedWithItems(userId: string, date: YYYYMMDD): Promise<FeedEntity[]> {
        const orm = await this.feedRepository.find({ where : { userId, date : date.toString() } })
        return orm.map(FeedOrmMapper.toDomain);
    }

}