import { PetPersonality } from "@app/pet/domain/enum/pet.enum";
import { PetEntity } from "@app/pet/domain/model/pet";
import { Command } from "@nestjs/cqrs";

export class UpdatePetCommand extends Command<PetEntity> {

    constructor(
        public readonly id : number,
        public readonly data : {
            name? : string,
            age? : number,
            personalities?: PetPersonality[];
            description? : string;
        }
    ) {
        super();
    }
}