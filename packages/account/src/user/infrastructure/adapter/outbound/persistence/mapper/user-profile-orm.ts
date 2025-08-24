import { UserProfileEntity } from "@app/user/domain/model/user-profile";
import { UserAttachmentOrmEntity } from "@core/database";

export class UserProfileOrmMapper {

    static toDomain(orm : UserAttachmentOrmEntity) : UserProfileEntity {
        return UserProfileEntity.of({
            path : orm.path,
            active : orm.isActive
        }).setPersistence({ userId : orm.userId, no : orm.no },orm.createdAt,orm.updatedAt)
    }

    static toOrm(domain : UserProfileEntity) : UserAttachmentOrmEntity {
        const orm = new UserAttachmentOrmEntity()
        orm.userId = domain.id.userId
        orm.no = domain.id.no
        orm.path = domain.path
        orm.isActive = domain.isActive
        orm.createdAt = domain.createdAt
        orm.updatedAt = domain.updatedAt
        return orm
    }
}