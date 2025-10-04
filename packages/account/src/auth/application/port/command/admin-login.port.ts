import { AuthToken } from "@app/auth/domain/model/auth-token";
import { Command } from "@nestjs/cqrs";

export class AdminLoginCommand extends Command<AuthToken> {

    constructor(
        public readonly id : string,
        public readonly password : string
    ){
        super()
    }
}