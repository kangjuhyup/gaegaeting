import { PetPersonality } from "@app/pet/domain/enum/pet.enum";
import { PetProfileEntity } from "@app/pet/domain/model/pet-profile";
import { UserPrincipal } from "@core/auth";
import { Command } from "@nestjs/cqrs";

export class UpdatePetCommand extends Command<PetProfileEntity> {

    constructor(
        public readonly id : number,
        public readonly user : UserPrincipal,
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