import { UserAttachmentOrmEntity } from "@core/database";
import { ProfileEntity } from '../../../../user/domain/model/profile';

export class ProfileMapper {

    static toDomain(orm : UserAttachmentOrmEntity) : ProfileEntity {
        return ProfileEntity.of({
            path : orm.path,
            active : orm.isActive
        }).setPersistence(orm.id,orm.createdAt,orm.updatedAt)
    }
}