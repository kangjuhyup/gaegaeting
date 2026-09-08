import { EntityManager, PetProfileOrmEntity } from "@core/database/mikro";
import { Injectable } from "@nestjs/common";
import { PetOrmMapper } from "./mapper/pet-orm.js";
import { PetProfileEntity } from "#app/pet/domain/model/pet-profile";
import { PetProfileRepositoryPort } from "#app/pet/infrastructure/port/pet-profile-repository.port";

/**
 * 반려동물 프로필 ORM 리포지토리
 * 
 * PetProfileOrmEntity를 사용하여 반려동물 프로필 데이터를 관리합니다.
 */
@Injectable()
export class PetProfileOrmRepository implements PetProfileRepositoryPort {

    constructor(private readonly entityManager: EntityManager) {}

    private get repository() {
        return this.entityManager.getRepository(PetProfileOrmEntity);
    }

    async insertPet(pet: PetProfileEntity): Promise<PetProfileEntity> {
        const orm = PetOrmMapper.toOrm(pet);
        this.entityManager.persist(orm);
        await this.entityManager.flush();
        return PetOrmMapper.toDomain(orm);
    }

    async selectPetFromId(id: number): Promise<PetProfileEntity> {
        const orm = await this.repository.findOne({ id });
        return PetOrmMapper.toDomain(orm);
    }

    async selectPetFromUserId(userId: string): Promise<PetProfileEntity[]> {
        const orm = await this.repository.find(
            { owner: userId },
            { populate: ['attachments'] },
        );
        return orm.map(PetOrmMapper.toDomain);
    }

    async updatePet(pet: PetProfileEntity): Promise<PetProfileEntity> {
        const orm = PetOrmMapper.toOrm(pet);
        const current = await this.repository.findOneOrFail({ id: orm.id });
        this.entityManager.assign(current, orm);
        await this.entityManager.flush();
        return PetOrmMapper.toDomain(current);
    }

    async deletePet(id: number): Promise<void> {
        await this.entityManager.nativeDelete(PetProfileOrmEntity, { id });
    }
}
