import { GetUserProfileQuery } from '../../port/query/get-user-profile.port.js';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserAttachmentEntity } from '#app/user/domain/model/user-attachment';
import { UserProfileEntity } from '#app/user/domain/model/user-profile';
import { UserProfileRepositoryPort } from '#app/user/infrastructure/port/user-profile-repository.port';
import { ProfileImageService } from '../../../../common/profile-images/profile-image.service.js';

@QueryHandler(GetUserProfileQuery)
export class GetUserProfileHandler implements IQueryHandler<GetUserProfileQuery> {
  constructor(private readonly users: UserProfileRepositoryPort, private readonly images: ProfileImageService) {}
  async execute(query: GetUserProfileQuery): Promise<{ profile: UserProfileEntity | null; profileImages: UserAttachmentEntity[] }> {
    const profile = await this.users.selectUserProfileFromId(query.userId);
    if (!profile) return { profile: null, profileImages: [] };
    const urls = await this.images.approvedUrls('USER', query.userId);
    return { profile, profileImages: urls.map((path, no) => UserAttachmentEntity.of({ path, active: true }, { userId: query.userId, no })) };
  }
}
