import { UserGender, UserRegion } from "@app/user/domain/enum/user.enum";
import { UserEntity } from "@app/user/domain/model/user";
import { Command } from "@nestjs/cqrs";

export class UpdateUserCommand extends Command<UserEntity> {
  constructor(
    public readonly id: string,
    public readonly data: {
      nickname?: string;
      profileImageUrl?: string;
      gender?: UserGender;
      region?: UserRegion;
      bio?: string;
    },
  ) {
    super();
  }
}
