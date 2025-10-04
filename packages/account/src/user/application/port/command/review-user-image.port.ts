import { Command } from "@nestjs/cqrs";

export class ReviewUserImageCommand extends Command<void> {

    constructor(
        public readonly userId : string,
        public readonly path : string,
        public readonly approve : boolean,
    ) {
        super()
    }
}