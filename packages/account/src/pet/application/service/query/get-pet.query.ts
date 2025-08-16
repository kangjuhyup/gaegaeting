import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { GetPetQuery } from "../../port/in/query/get-pet.port";
import { PetEntity } from "@app/pet/domain/model/pet";
import { PetRepositoryPort } from "@app/pet/domain/port/out/pet-repository.port";

@QueryHandler(GetPetQuery)
export class GetPetHandler implements IQueryHandler<GetPetQuery,PetEntity> {
    constructor(
        private readonly petRepository : PetRepositoryPort
    ) {}
    execute(query: GetPetQuery): Promise<PetEntity> {
        return this.petRepository.selectPetFromId(query.petId);
    }
}