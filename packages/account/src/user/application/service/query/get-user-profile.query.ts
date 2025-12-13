import { GetUserProfileQuery } from "../../port/query/get-user-profile.port";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { UserStoragePort } from '../../../infrastructure/port/user-storage.port';
import { UserAttachmentEntity } from "@app/user/domain/model/user-attachment";
import { UserProfileEntity } from "@app/user/domain/model/user-profile";
import { UserProfileRepositoryPort } from "@app/user/infrastructure/port/user-profile-repository.port";
import { UserAttachmentRepositoryPort } from "@app/user/infrastructure/port/user-attachment-repository.port";

@QueryHandler(GetUserProfileQuery)
export class GetUserProfileHandler implements IQueryHandler<GetUserProfileQuery, {
  profile : UserProfileEntity,
  profileImages : UserAttachmentEntity[]
}> {
  
  constructor(
    private readonly userProfileRepository: UserProfileRepositoryPort,
    private readonly userAttachmentRepository: UserAttachmentRepositoryPort,
    private readonly userStoragePort: UserStoragePort
  ) {}

  async execute(query: GetUserProfileQuery): Promise<{
    profile : UserProfileEntity,
    profileImages : UserAttachmentEntity[]
  }> {
    const profile = await this.userProfileRepository.selectUserProfileFromId(query.userId);
    const attachments = await this.userAttachmentRepository.selectUserAttachments(query.userId);
    const profileImages = (await Promise.all(
      attachments.map(async (profileImage) => {
        const hasMetadata = await this.userStoragePort.hasMetadata(
          query.userId,
          profileImage.id.no,
        );
        if (!hasMetadata) {
          // TODO: slack 알림 전송
          return null;
        }
        return profileImage;
      }),
    )).filter(Boolean) as UserAttachmentEntity[];
    return {
      profile,
      profileImages
    };
  }
}
