import { PetEntity } from "@app/pet/domain/model/pet";
import { PetRepositoryPort } from "@app/pet/domain/port/pet-repository.port";
import { PetOrmEntity, BaseRepository } from "@core/database";
import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { PetOrmMapper } from "./mapper/pet-orm";
import { PetAttachmentOrmEntity } from "@core/database";
import { PetProfileEntity } from "@app/pet/domain/model/pet-profile";
import { PetProfileOrmMapper } from "./mapper/pet-profile-orm";

@Injectable()
export class PetOrmRepository extends BaseRepository<PetOrmEntity> implements PetRepositoryPort {

    private petAttachmentRepository: BaseRepository<PetAttachmentOrmEntity>;

    constructor(dataSource: DataSource) {
        super(PetOrmEntity, dataSource);
        this.petAttachmentRepository = new BaseRepository(PetAttachmentOrmEntity, dataSource);
    }
    async insertPet(pet: PetEntity): Promise<PetEntity> {
        const orm = PetOrmMapper.toOrm(pet);
        const inserted = await this.getRepository().save(orm);
        return PetOrmMapper.toDomain(inserted);
    }
    async selectPetFromId(id: number): Promise<PetEntity> {
        const orm = await this.getRepository().findOneBy({ id });
        return PetOrmMapper.toDomain(orm);
    }
    async selectPetFromUserId(userId: string): Promise<PetEntity[]> {
        const orm = await this.getRepository().find({ where: { userId } , relations : { attachments : true } });
        return orm.map(PetOrmMapper.toDomain);
    }
    async updatePet(pet: PetEntity): Promise<PetEntity> {
        const orm = PetOrmMapper.toOrm(pet);
        const updated = await this.getRepository().save(orm);
        return PetOrmMapper.toDomain(updated);
    }
    async deletePet(id: number): Promise<void> {
        await this.getRepository().delete(id);
    }

    async insertPetAttachment(pet : PetProfileEntity) : Promise<PetProfileEntity> {
        const orm = PetProfileOrmMapper.toOrm(pet);
        const inserted = await this.petAttachmentRepository.getRepository().save(orm);
        return PetProfileOrmMapper.toDomain(inserted);
    }
}