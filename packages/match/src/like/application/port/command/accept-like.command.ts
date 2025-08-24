import { UserPrincipal } from "@core/auth";
import { Command } from "@nestjs/cqrs";

export class AcceptLikeCommand extends Command<void> {
    
    constructor(
        public readonly user : UserPrincipal,
        public readonly likeId : number
    ) {
        super();
    }
}