import { PetProfileEntity } from "@app/pet/domain/model/pet-profile";
import { Query } from "@nestjs/cqrs";

export class GetPetQuery extends Query<PetProfileEntity> {

    constructor(
        public readonly petId : number
    ) {
        super();
    }
}