import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { GetPetQuery } from "../../port/query/get-pet.port";
import { PetEntity } from "@app/pet/domain/model/pet";
import { PetProfileRepositoryPort } from "@app/pet/infrastructure/port/pet-profile-repository.port";

@QueryHandler(GetPetQuery)
export class GetPetHandler implements IQueryHandler<GetPetQuery,PetEntity> {
    constructor(
        private readonly petProfileRepository : PetProfileRepositoryPort
    ) {}
    execute(query: GetPetQuery): Promise<PetEntity> {
        return this.petProfileRepository.selectPetFromId(query.petId);
    }
}