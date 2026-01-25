import { PetProfileEntity } from "@app/pet/domain/model/pet-profile";
import { PetAttachemntEntity } from "@app/pet/domain/model/pet-attachment";
import { Query } from "@nestjs/cqrs";

export class GetPetsQuery extends Query<{ pet: PetProfileEntity, profile: PetAttachemntEntity[] }[]> {

    constructor(
        public readonly userId : string
    ) {
        super();
    }
}