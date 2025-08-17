import { Command } from "@nestjs/cqrs";

export class DeleteProfileImageCommand extends Command<void> {

    constructor(
        public readonly userId : string,
        public readonly no : number,
    ) {
        super();
    }
}