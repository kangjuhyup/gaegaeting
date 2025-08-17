import { Command } from "@nestjs/cqrs";

export class UnRegisterPetCommand extends Command<void> {
    constructor(
        public readonly userId : string,
        public readonly petId : string
    ) {
        super();
    }
}