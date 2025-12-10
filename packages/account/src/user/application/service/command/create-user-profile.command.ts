import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { UserProfileRepositoryPort } from "@app/user/infrastructure/port/user-profile-repository.port";
import { Transactional } from "@core/database";
import { UserProfileEntity } from "@app/user/domain/model/user-profile";
import { CreateUserProfileCommand } from "../../port/command/create-user-profile.port";

@CommandHandler(CreateUserProfileCommand)
export class CreateUserProfileHandler implements ICommandHandler<CreateUserProfileCommand, UserProfileEntity> {
  constructor(
    private readonly userProfileRepository: UserProfileRepositoryPort
  ) {}

  @Transactional()
  async execute(command: CreateUserProfileCommand): Promise<UserProfileEntity> {
    const existsUser = await this.userProfileRepository.selectUserProfileFromId(command.user.userId);

    if (existsUser) {
      throw new Error("이미 존재하는 사용자입니다.");
    }
    const userProfile = await this.userProfileRepository.insertUserProfile(UserProfileEntity.of(command.data, command.user.userId));
    return userProfile;
  } 
}
