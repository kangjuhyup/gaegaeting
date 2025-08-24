import { FeedItemEntity } from "@app/feed/domain/model/feed-item";
import { FeedItemOrmEntity } from "@core/database";

export class FeedItemOrmMapper {

    static toDomain(orm:FeedItemOrmEntity) : FeedItemEntity {
        return FeedItemEntity.of({
            targetUserId : orm.targetUserId,
            feedId : orm.feedId,
            state : orm.state,
        }).setPersistence(orm.id,orm.createdAt,orm.updatedAt)
    }

    static toOrm(domain:FeedItemEntity) : FeedItemOrmEntity {
        const orm = new FeedItemOrmEntity();
        orm.id = domain.id;
        orm.targetUserId = domain.targetUserId;
        orm.feedId = domain.feedId;
        orm.state = domain.state;
        orm.createdAt = domain.createdAt;
        orm.updatedAt = domain.updatedAt;
        return orm;
    }
}