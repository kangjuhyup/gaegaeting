import { QueryHandler } from "@nestjs/cqrs";
import { GetPetsQuery } from "../../port/query/get-pets.port";
import { PetProfileEntity } from "@app/pet/domain/model/pet-profile";
import { PetProfileRepositoryPort } from "@app/pet/infrastructure/port/pet-profile-repository.port";
import { IQueryHandler } from "@nestjs/cqrs";
import { PetAttachmentRepositoryPort } from "@app/pet/infrastructure/port/pet-attachment-repository.port";
import { PetAttachemntEntity } from "@app/pet/domain/model/pet-attachment";

@QueryHandler(GetPetsQuery)
export class GetPetsHandler implements IQueryHandler<GetPetsQuery,PetProfileEntity[]> {
    constructor(
        private readonly petProfileRepository : PetProfileRepositoryPort,
        private readonly petAttachmentRepository : PetAttachmentRepositoryPort
    ) {}
    async execute(query: GetPetsQuery): Promise<{ pet: PetProfileEntity, profile: PetAttachemntEntity[] }[]> {
        const pets = await this.petProfileRepository.selectPetFromUserId(query.userId);
        const profiles = await this.petAttachmentRepository.selectPetAttachmentsFromPetIds(pets.map(pet => pet.id));
        return pets.map(pet => ({
            pet,
            profile: profiles.filter(profile => profile.petId === pet.id)
        }));
    }
}