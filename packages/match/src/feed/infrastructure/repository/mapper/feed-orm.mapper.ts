import { FeedEntity } from "@app/feed/domain/model/feed";
import { FeedOrmEntity } from "@core/database";
import { YYYYMMDD } from "@core/util";

export class FeedOrmMapper {

    static toDomain(orm : FeedOrmEntity) : FeedEntity {
        return FeedEntity.of({
            userId: orm.userId,
            date: new YYYYMMDD(orm.date),
            slot: orm.slot,
        }).setPersistence(orm.id,orm.createdAt,orm.updatedAt)
    }

    static toOrm(domain : FeedEntity) : FeedOrmEntity {
        const orm = new FeedOrmEntity();
        orm.id = domain.id;
        orm.userId = domain.userId;
        orm.date = domain.date.toString();
        orm.slot = domain.slot;
        orm.createdAt = domain.createdAt;
        orm.updatedAt = domain.updatedAt;
        return orm;
    }
}