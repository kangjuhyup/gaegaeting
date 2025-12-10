import { UserProfileRepositoryPort } from "@app/user/infrastructure/port/user-profile-repository.port";
import { UserProfileEntity } from "@app/user/domain/model/user-profile";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { UpdateUserProfileCommand } from "../../port/command/update-user-profile.port";
import { Transactional } from "@core/database";

@CommandHandler(UpdateUserProfileCommand)
export class UpdateUserProfileHandler implements ICommandHandler<UpdateUserProfileCommand> {

    constructor(
        private readonly userProfileRepository: UserProfileRepositoryPort
    ) {}

    @Transactional()
    async execute(command: UpdateUserProfileCommand): Promise<UserProfileEntity> {
        const existsUser = await this.userProfileRepository.selectUserProfileFromId(command.id);
        if(!existsUser) {
            throw new Error("존재하지 않는 사용자입니다.");
        }
        existsUser.updateInfo(command.data);
        const user = await this.userProfileRepository.updateUserProfile(existsUser);
        return user;
    }
}
