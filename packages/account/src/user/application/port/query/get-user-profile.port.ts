import { UserAttachmentEntity } from "@app/user/domain/model/user-attachment";
import { UserProfileEntity } from "@app/user/domain/model/user-profile";
import { Query } from "@nestjs/cqrs";

export class GetUserProfileQuery extends Query<{
  profile : UserProfileEntity,
  profileImages : UserAttachmentEntity[]
}> {
  constructor(public readonly userId: string) {
    super();
  }
}
