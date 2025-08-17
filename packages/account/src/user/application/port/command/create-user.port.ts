import { UserEntity } from "@app/user/domain/model/user";
import { Command } from "@nestjs/cqrs";

export class CreateUserCommand extends Command<UserEntity> {
    constructor(
        public readonly providerType : number,
        public readonly providerId : string,
        public readonly user : UserEntity
    ) {
        super();
    }
}