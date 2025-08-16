import { PetEntity } from "@app/pet/domain/model/pet";
import { Command } from "@nestjs/cqrs";

export class RegisterPetCommand extends Command<PetEntity> {
    constructor(
        public readonly pet : PetEntity
    ) {
        super();
    }
}