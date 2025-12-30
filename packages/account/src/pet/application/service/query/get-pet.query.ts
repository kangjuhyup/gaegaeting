import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { GetPetQuery } from "../../port/query/get-pet.port";
import { PetProfileEntity } from "@app/pet/domain/model/pet-profile";
import { PetProfileRepositoryPort } from "@app/pet/infrastructure/port/pet-profile-repository.port";

@QueryHandler(GetPetQuery)
export class GetPetHandler implements IQueryHandler<GetPetQuery,PetProfileEntity> {
    constructor(
        private readonly petProfileRepository : PetProfileRepositoryPort
    ) {}
    execute(query: GetPetQuery): Promise<PetProfileEntity> {
        return this.petProfileRepository.selectPetFromId(query.petId);
    }
}