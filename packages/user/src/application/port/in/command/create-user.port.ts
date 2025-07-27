import { UserEntity } from "@app/domain/model/user";
import { Command } from "@nestjs/cqrs";

export class CreateUserCommand extends Command<UserEntity> {
    constructor(
        public readonly user : UserEntity
    ) {
        super();
    }
}