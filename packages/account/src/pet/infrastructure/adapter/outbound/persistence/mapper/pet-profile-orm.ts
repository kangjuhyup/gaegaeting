import { PetAttachmentOrmEntity } from "@core/database";
import { PetProfileEntity } from "@app/pet/domain/model/pet-profile";

export class PetProfileOrmMapper {

    static toDomain(orm : PetAttachmentOrmEntity) : PetProfileEntity {
        return PetProfileEntity.of({
            path : orm.path,
            active : orm.isActive,
        }).setPersistence({ petId : orm.petId, no : orm.no },orm.createdAt,orm.updatedAt)
    }

    static toOrm(entity : PetProfileEntity) : PetAttachmentOrmEntity {
        const orm = new PetAttachmentOrmEntity()
        orm.petId = entity.id.petId
        orm.no = entity.id.no
        orm.path = entity.path
        orm.isActive = entity.isActive
        orm.createdAt = entity.createdAt
        orm.updatedAt = entity.updatedAt
        return orm
    }
}   