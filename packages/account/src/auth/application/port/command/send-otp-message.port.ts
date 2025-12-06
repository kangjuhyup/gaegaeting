import { UserPrincipal } from "@core/auth";
import { Command } from "@nestjs/cqrs";

export class SendOptMessageCommand extends Command<string> {

    constructor(
        public readonly user : UserPrincipal,
        public readonly phoneNumber : string
    ){
        super()
    }
}