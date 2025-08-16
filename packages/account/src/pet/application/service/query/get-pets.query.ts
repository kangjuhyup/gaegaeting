import { QueryHandler } from "@nestjs/cqrs";
import { GetPetsQuery } from "../../port/in/query/get-pets.port";
import { PetEntity } from "@app/pet/domain/model/pet";
import { PetRepositoryPort } from "@app/pet/domain/port/out/pet-repository.port";
import { IQueryHandler } from "@nestjs/cqrs";

@QueryHandler(GetPetsQuery)
export class GetPetsHandler implements IQueryHandler<GetPetsQuery,PetEntity[]> {
    constructor(
        private readonly petRepository : PetRepositoryPort
    ) {}
    execute(query: GetPetsQuery): Promise<PetEntity[]> {
        return this.petRepository.selectPetFromUserId(query.userId);
    }
}