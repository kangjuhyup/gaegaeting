import { PetEntity } from "@app/domain/model/pet";
import { Query } from "@nestjs/cqrs";

export class GetPetsQuery extends Query<PetEntity[]> {

    constructor(
        public readonly userId : string
    ) {
        super();
    }
}