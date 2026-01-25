import { PetAttachmentOrmEntity, BaseRepository } from "@core/database";
import { Injectable } from "@nestjs/common";
import { DataSource, In } from "typeorm";
import { PetAttachemntEntity } from "@app/pet/domain/model/pet-attachment";
import { PetProfileOrmMapper } from "./mapper/pet-profile-orm";
import { PetAttachmentRepositoryPort } from "@app/pet/infrastructure/port/pet-attachment-repository.port";

/**
 * 반려동물 첨부파일 ORM 리포지토리
 * 
 * PetAttachmentOrmEntity를 사용하여 반려동물 첨부파일(프로필 이미지) 데이터를 관리합니다.
 */
@Injectable()
export class PetAttachmentOrmRepository extends BaseRepository<PetAttachmentOrmEntity> implements PetAttachmentRepositoryPort {

    constructor(dataSource: DataSource) {
        super(PetAttachmentOrmEntity, dataSource);
    }

    async insertPetAttachment(pet: PetAttachemntEntity): Promise<PetAttachemntEntity> {
        const orm = PetProfileOrmMapper.toOrm(pet);
        const inserted = await this.getRepository().save(orm);
        return PetProfileOrmMapper.toDomain(inserted);
    }

    async selectPetAttachmentsFromPetIds(petIds: number[]): Promise<PetAttachemntEntity[]> {
        const orms = await this.getRepository().find({ where: { petId: In(petIds), isActive: true } });
        return orms.map(orm => PetProfileOrmMapper.toDomain(orm));
    }
}

