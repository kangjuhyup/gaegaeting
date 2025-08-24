import { Command } from "@nestjs/cqrs";
import { UserPrincipal } from "@core/auth";

export class ReportPairCommand extends Command<void> {

    constructor(
        public readonly user : UserPrincipal,
        public readonly pairId : number,
        public readonly reason : string 
    ) {
        super()
    }
}