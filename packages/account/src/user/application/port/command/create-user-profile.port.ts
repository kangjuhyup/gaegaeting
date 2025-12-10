import { IUserProfile, UserProfileEntity } from "@app/user/domain/model/user-profile";
import { UserPrincipal } from "@core/auth";
import { Command } from "@nestjs/cqrs";

export class CreateUserProfileCommand extends Command<UserProfileEntity> {
    constructor(
        public readonly user : UserPrincipal,
        public readonly data : UserProfileEntity,
    ) {
        super();
    }
}