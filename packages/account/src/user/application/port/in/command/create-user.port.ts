import { UserEntity } from "@app/user/domain/model/user";
import { AuthProviderPrincipal } from "@core/auth";
import { Command } from "@nestjs/cqrs";

export class CreateUserCommand extends Command<UserEntity> {
    constructor(
        public readonly authProvider : AuthProviderPrincipal,
        public readonly user : UserEntity
    ) {
        super();
    }
}