import { PetEntity } from "@app/pet/domain/model/pet";
import { PetRepositoryPort } from "@app/pet/domain/port/out/pet-repository.port";
import { PetOrmEntity } from "@core/database";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PetOrmMapper } from "./mapper/pet-orm";

@Injectable()
export class PetOrmRepository implements PetRepositoryPort {

    constructor(
        @InjectRepository(PetOrmEntity)
        private readonly petRepository : Repository<PetOrmEntity>
    ){}
    async insertPet(pet: PetEntity): Promise<PetEntity> {
        const orm = PetOrmMapper.toOrm(pet);
        const inserted = await this.petRepository.save(orm);
        return PetOrmMapper.toDomain(inserted);
    }
    async selectPetFromId(id: number): Promise<PetEntity> {
        const orm = await this.petRepository.findOneBy({ id });
        return PetOrmMapper.toDomain(orm);
    }
    async selectPetFromUserId(userId: string): Promise<PetEntity[]> {
        const orm = await this.petRepository.find({ where: { userId } });
        return orm.map(PetOrmMapper.toDomain);
    }
    async updatePet(pet: PetEntity): Promise<PetEntity> {
        const orm = PetOrmMapper.toOrm(pet);
        const updated = await this.petRepository.save(orm);
        return PetOrmMapper.toDomain(updated);
    }
    async deletePet(id: number): Promise<void> {
        await this.petRepository.delete(id);
    }
}