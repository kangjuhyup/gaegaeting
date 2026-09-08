import { EntityManager, PetAttachmentOrmEntity } from "@core/database/mikro";
import { Injectable } from "@nestjs/common";
import { PetAttachemntEntity } from "#app/pet/domain/model/pet-attachment";
import { PetProfileOrmMapper } from "./mapper/pet-profile-orm.js";
import { PetAttachmentRepositoryPort } from "#app/pet/infrastructure/port/pet-attachment-repository.port";

/**
 * 반려동물 첨부파일 ORM 리포지토리
 * 
 * PetAttachmentOrmEntity를 사용하여 반려동물 첨부파일(프로필 이미지) 데이터를 관리합니다.
 */
@Injectable()
export class PetAttachmentOrmRepository implements PetAttachmentRepositoryPort {

    constructor(private readonly entityManager: EntityManager) {}

    private get repository() {
        return this.entityManager.getRepository(PetAttachmentOrmEntity);
    }

    async insertPetAttachment(pet: PetAttachemntEntity): Promise<PetAttachemntEntity> {
        const orm = PetProfileOrmMapper.toOrm(pet);
        this.entityManager.persist(orm);
        await this.entityManager.flush();
        return PetProfileOrmMapper.toDomain(orm);
    }

    async selectPetAttachmentsFromPetIds(petIds: number[]): Promise<PetAttachemntEntity[]> {
        const orms = await this.repository.find({ pet: { $in: petIds }, isActive: true });
        return orms.map(orm => PetProfileOrmMapper.toDomain(orm));
    }
}
