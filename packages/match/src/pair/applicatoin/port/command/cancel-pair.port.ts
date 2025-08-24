import { Command } from "@nestjs/cqrs";
import { UserPrincipal } from "@core/auth";

export class CancelPairCommand extends Command<void> {

    constructor(
        public readonly user : UserPrincipal,
        public readonly pairId : number 
    ) {
        super()
    }
}