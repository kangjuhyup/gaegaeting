import { PetBreed, PetGender, PetPersonality, PetSize } from "@app/pet/domain/enum/pet.enum";
import { PetEntity } from "@app/pet/domain/model/pet";
import { PetProfileOrmEntity } from "@core/database";

export class PetOrmMapper {

    static toDomain(orm: PetProfileOrmEntity) : PetEntity {
        if(!orm) return null;

        return PetEntity.of({
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

    static toOrm(pet:PetEntity) : PetProfileOrmEntity {
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