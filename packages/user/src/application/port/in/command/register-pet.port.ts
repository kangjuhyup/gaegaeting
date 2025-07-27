import { PetEntity } from "@app/domain/model/pet";
import { Command } from "@nestjs/cqrs";

export class RegisterPetCommand extends Command<PetEntity> {
    constructor(
        public readonly userId : string,
        public readonly pet : PetEntity
    ) {
        super();
    }
}