import { ProfileEntity } from "@app/user/domain/model/profile";
import { UserAttachmentOrmEntity } from "@core/database";

export class ProfileOrmMapper {

    static toDomain(orm : UserAttachmentOrmEntity) : ProfileEntity {
        return ProfileEntity.of({
            path : orm.path,
            active : orm.isActive
        }).setPersistence(orm.id,orm.createdAt,orm.updatedAt)
    }

    static toOrm(domain : ProfileEntity) : UserAttachmentOrmEntity {
        const orm = new UserAttachmentOrmEntity()
        orm.id = domain.id
        orm.path = domain.path
        orm.isActive = domain.active
        orm.createdAt = domain.createdAt
        orm.updatedAt = domain.updatedAt
        return orm
    }
}