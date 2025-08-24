import { PairEntity } from "@app/pair/domain/model/pair";
import { PairOrmEntity } from "@core/database";

export class PairOrmMapper {

    static toDomain(orm : PairOrmEntity) : PairEntity {
        return PairEntity.of({
            leftUserId: orm.leftUserId,
            rightUserId: orm.rightUserId,
            active: orm.active
        }).setPersistence(orm.id,orm.createdAt,orm.updatedAt)
    }

    static toOrm(domain : PairEntity) : PairOrmEntity {
        const orm = new PairOrmEntity()
        orm.id = domain.id
        orm.leftUserId = domain.leftUserId
        orm.rightUserId = domain.rightUserId
        orm.active = domain.active
        orm.createdAt = domain.createdAt
        orm.updatedAt = domain.updatedAt
        return orm
    }
}