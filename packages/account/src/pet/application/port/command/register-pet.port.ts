import { PetProfileEntity } from "@app/pet/domain/model/pet-profile";
import { Command } from "@nestjs/cqrs";
import { UserPrincipal } from "@core/auth";

export class RegisterPetCommand extends Command<PetProfileEntity> {
    constructor(
        public readonly user : UserPrincipal,
        public readonly pet : PetProfileEntity
    ) {
        super();
    }
}