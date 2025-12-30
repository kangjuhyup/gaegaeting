import { PetAttachmentOrmEntity } from "@core/database";
import { PetAttachemntEntity } from "@app/pet/domain/model/pet-attachment";

export class PetProfileOrmMapper {

    static toDomain(orm : PetAttachmentOrmEntity) : PetAttachemntEntity {
        return PetAttachemntEntity.of({
            path : orm.path,
            active : orm.isActive,
        }).setPersistence({ petId : orm.petId, no : orm.no },orm.createdAt,orm.updatedAt)
    }

    static toOrm(entity : PetAttachemntEntity) : PetAttachmentOrmEntity {
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