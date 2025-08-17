import { PetEntity } from "@app/pet/domain/model/pet";
import { Command } from "@nestjs/cqrs";
import { UserPrincipal } from "@core/auth";

export class RegisterPetCommand extends Command<PetEntity> {
    constructor(
        public readonly user : UserPrincipal,
        public readonly pet : PetEntity
    ) {
        super();
    }
}