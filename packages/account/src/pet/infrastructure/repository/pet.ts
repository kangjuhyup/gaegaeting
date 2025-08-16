import { PetEntity } from "@app/pet/domain/model/pet";
import { PetRepositoryPort } from "@app/pet/domain/port/out/pet-repository.port";
import { PetOrmEntity } from "@core/database";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

@Injectable()
export class PetOrmRepository implements PetRepositoryPort {

    constructor(
        @InjectRepository(PetOrmEntity)
        private readonly petRepository : Repository<PetOrmEntity>
    ){}
    insertPet(pet: PetEntity): Promise<PetEntity> {
        throw new Error("Method not implemented.");
    }
    selectPetFromId(id: number): Promise<PetEntity> {
        throw new Error("Method not implemented.");
    }
    selectPetFromUserId(userId: string): Promise<PetEntity[]> {
        throw new Error("Method not implemented.");
    }
    updatePet(pet: PetEntity): Promise<PetEntity> {
        throw new Error("Method not implemented.");
    }
    deletePet(id: number): Promise<void> {
        throw new Error("Method not implemented.");
    }

    
}