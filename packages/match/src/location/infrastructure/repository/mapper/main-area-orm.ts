import { MainAreaEntity } from "@app/location/domain/model/main-area";
import { MainAreaOrmEntity } from "@core/database";

export class MainAreaOrmMapper {

    static toDomain(orm : MainAreaOrmEntity) : MainAreaEntity {
        return MainAreaEntity.of({
            code : orm.code,
            name : orm.name,
            parentCode : orm.parentCode,
        }).setPersistence(orm.userId,orm.createdAt,orm.updatedAt)
    }

    static toOrm(domain : MainAreaEntity) : MainAreaOrmEntity {

        const orm = new MainAreaOrmEntity();

        orm.userId = domain.id;
        orm.code = domain.code;
        orm.name = domain.name;
        orm.createdAt = domain.createdAt;
        orm.updatedAt = domain.updatedAt;
        orm.parentCode = domain.parentCode;

        return orm;
    }
}