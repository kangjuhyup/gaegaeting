import { Command } from "@nestjs/cqrs";

export class VerifyOptMessageCommand extends Command<{ success : boolean, remainingAttempts? : number}> {

    constructor(
        public readonly phoneNumber : string,
        public readonly opt : string
    ){
        super()
    }
}