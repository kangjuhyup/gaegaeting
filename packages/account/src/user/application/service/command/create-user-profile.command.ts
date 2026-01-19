import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { UserProfileRepositoryPort } from "@app/user/infrastructure/port/user-profile-repository.port";
import { Transactional, UserProfileStatus } from "@core/database";
import { UserProfileEntity } from "@app/user/domain/model/user-profile";
import { CreateUserProfileCommand } from "../../port/command/create-user-profile.port";

@CommandHandler(CreateUserProfileCommand)
export class CreateUserProfileHandler implements ICommandHandler<CreateUserProfileCommand, UserProfileEntity> {
  constructor(
    private readonly userProfileRepository: UserProfileRepositoryPort,
  ) {}

  @Transactional()
  async execute(command: CreateUserProfileCommand): Promise<UserProfileEntity> {
    const existsUser = await this.userProfileRepository.selectUserProfileFromId(command.user.userId);

    if (existsUser) {
      throw new Error("이미 존재하는 사용자입니다.");
    }
    // status가 null/undefined로 들어오는 케이스가 있어 기본값만 보정
    command.data.status ??= UserProfileStatus.ACTIVE;
    const userProfile = await this.userProfileRepository.insertUserProfile(UserProfileEntity.of(command.data, command.user.userId));
    return userProfile;
  } 
}
