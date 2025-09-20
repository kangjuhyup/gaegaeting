import { FeedEntity } from "@app/feed/domain/model/feed";
import { FeedRepositoryPort } from "@app/feed/domain/port/feed.repository.port";
import { FeedOrmEntity, BaseRepository } from "@core/database";
import { YYYYMMDD } from "@core/util";
import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { FeedOrmMapper } from "./mapper/feed-orm.mapper";

@Injectable()
export class FeedOrmRepository extends BaseRepository<FeedOrmEntity> implements FeedRepositoryPort {

    constructor(dataSource: DataSource) {
        super(FeedOrmEntity, dataSource);
    }

    async getMyFeedWithItems(userId: string, date: YYYYMMDD): Promise<FeedEntity[]> {
        const orm = await this.getRepository().find({ where : { userId, date : date.toString() }, relations : { items : true } })
        return orm.map(FeedOrmMapper.toDomain);
    }

}