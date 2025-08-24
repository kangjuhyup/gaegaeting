import { LikeEntity } from "@app/like/domain/model/like";
import { LikeOrmEntity } from "@core/database";

export class LikeOrmMapper {

    static toDomain(orm:LikeOrmEntity) : LikeEntity {
        return LikeEntity.of({
            likerId : orm.likerId,
            likeeId : orm.likeeId,
            source : orm.source,
            active : orm.active,
        }).setPersistence(orm.id,orm.createdAt,orm.updatedAt)
    }

    static toOrm(model:LikeEntity) : LikeOrmEntity {
        const orm = new LikeOrmEntity();
        orm.id = model.id;
        orm.likerId = model.likerId;
        orm.likeeId = model.likeeId;
        orm.source = model.source;
        orm.active = model.active;
        orm.createdAt = model.createdAt;
        orm.updatedAt = model.updatedAt;
        return orm;
    }
}