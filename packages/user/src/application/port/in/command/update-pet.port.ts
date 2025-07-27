import { PetEntity } from "@app/domain/model/pet";
import { Command } from "@nestjs/cqrs";

export class UpdatePetCommand extends Command<PetEntity> {

    constructor(
        public readonly userId : string,
        public readonly data : {}
    ) {
        super();
    }
}