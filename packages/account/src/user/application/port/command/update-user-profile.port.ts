import { UserGender, UserRegion } from "@app/user/domain/enum/user.enum";
import { UserProfileEntity } from "@app/user/domain/model/user-profile";
import { Command } from "@nestjs/cqrs";

export class UpdateUserProfileCommand extends Command<UserProfileEntity> {
  constructor(
    public readonly id: string,
    public readonly data: {
      nickname?: string;
      gender?: UserGender;
      region?: UserRegion;
      bio?: string;
    },
  ) {
    super();
  }
}
