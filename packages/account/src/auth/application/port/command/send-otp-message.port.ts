import { Command } from "@nestjs/cqrs";

export class SendOptMessageCommand extends Command<string> {

    constructor(
        public readonly phoneNumber : string
    ){
        super()
    }
}