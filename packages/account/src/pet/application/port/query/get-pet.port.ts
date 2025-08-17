import { PetEntity } from "@app/pet/domain/model/pet";
import { Query } from "@nestjs/cqrs";

export class GetPetQuery extends Query<PetEntity> {

    constructor(
        public readonly petId : number
    ) {
        super();
    }
}