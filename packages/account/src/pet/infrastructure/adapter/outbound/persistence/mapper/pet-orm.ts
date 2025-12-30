import { PetBreed, PetGender, PetPersonality, PetSize } from "@app/pet/domain/enum/pet.enum";
import { PetProfileEntity } from "@app/pet/domain/model/pet-profile";
import { PetProfileOrmEntity } from "@core/database";

export class PetOrmMapper {

    static toDomain(orm: PetProfileOrmEntity) : PetProfileEntity {
        if(!orm) return null;

        return PetProfileEntity.of({
            name: orm.name,
            age: orm.age,
            gender: PetGender.from(orm.gender),
            breed: PetBreed.from(orm.breed),
            size: PetSize.from(orm.size),
            personalities: orm.personalities.map(p => PetPersonality.from(Number(p))),
            description: orm.description,
            userId: orm.userId,
            certificationCode : orm.certificationCode,
            certification : orm.certification
        }).setPersistence(orm.id,orm.createdAt,orm.updatedAt);
    }

    static toOrm(pet:PetProfileEntity) : PetProfileOrmEntity {
        if(!pet) return null;

        const petOrm = new PetProfileOrmEntity();
        
        petOrm.id = pet.id;
        petOrm.name = pet.name;
        petOrm.age = pet.age;
        petOrm.gender = pet.gender.value;
        petOrm.breed = pet.breed.value;
        petOrm.size = pet.size.value;
        petOrm.personalities = pet.personalities.map(p => p.value);
        petOrm.description = pet.description;
        petOrm.userId = pet.userId;
        petOrm.createdAt = pet.createdAt;
        petOrm.updatedAt = pet.updatedAt;
        return petOrm;
    }
}