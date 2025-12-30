import { PetProfileOrmEntity, BaseRepository } from "@core/database";
import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { PetOrmMapper } from "./mapper/pet-orm";
import { PetProfileEntity } from "@app/pet/domain/model/pet-profile";
import { PetProfileRepositoryPort } from "@app/pet/infrastructure/port/pet-profile-repository.port";

/**
 * 반려동물 프로필 ORM 리포지토리
 * 
 * PetProfileOrmEntity를 사용하여 반려동물 프로필 데이터를 관리합니다.
 */
@Injectable()
export class PetProfileOrmRepository extends BaseRepository<PetProfileOrmEntity> implements PetProfileRepositoryPort {

    constructor(dataSource: DataSource) {
        super(PetProfileOrmEntity, dataSource);
    }

    async insertPet(pet: PetProfileEntity): Promise<PetProfileEntity> {
        const orm = PetOrmMapper.toOrm(pet);
        const inserted = await this.getRepository().save(orm);
        return PetOrmMapper.toDomain(inserted);
    }

    async selectPetFromId(id: number): Promise<PetProfileEntity> {
        const orm = await this.getRepository().findOneBy({ id });
        return PetOrmMapper.toDomain(orm);
    }

    async selectPetFromUserId(userId: string): Promise<PetProfileEntity[]> {
        const orm = await this.getRepository().find({ 
            where: { userId }, 
            relations: { attachments: true } 
        });
        return orm.map(PetOrmMapper.toDomain);
    }

    async updatePet(pet: PetProfileEntity): Promise<PetProfileEntity> {
        const orm = PetOrmMapper.toOrm(pet);
        const updated = await this.getRepository().save(orm);
        return PetOrmMapper.toDomain(updated);
    }

    async deletePet(id: number): Promise<void> {
        await this.getRepository().delete(id);
    }
}

