import { QueryHandler } from "@nestjs/cqrs";
import { GetPetsQuery } from "../../port/query/get-pets.port";
import { PetEntity } from "@app/pet/domain/model/pet";
import { PetProfileRepositoryPort } from "@app/pet/infrastructure/port/pet-profile-repository.port";
import { IQueryHandler } from "@nestjs/cqrs";

@QueryHandler(GetPetsQuery)
export class GetPetsHandler implements IQueryHandler<GetPetsQuery,PetEntity[]> {
    constructor(
        private readonly petProfileRepository : PetProfileRepositoryPort
    ) {}
    execute(query: GetPetsQuery): Promise<PetEntity[]> {
        return this.petProfileRepository.selectPetFromUserId(query.userId);
    }
}