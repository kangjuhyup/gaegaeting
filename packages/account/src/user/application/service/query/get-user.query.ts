import { GetUserQuery } from "../../port/query/get-user.port";
import { UserEntity } from "@app/user/domain/model/user";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { UserRepositoryPort } from "@app/user/domain/port/user-repository.port";
import { UserStoragePort } from '../../../domain/port/user-storage.port';
import { NotFoundException } from "@nestjs/common";

@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery, UserEntity> {
  
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly userStoragePort: UserStoragePort
  ) {}

  async execute(query: GetUserQuery): Promise<UserEntity> {
    const user = await this.userRepository.selectUserFromIdWithProfiles(query.id);
    if (!user) {
      throw new NotFoundException("프로필을 찾을 수 없습니다.");
    }
    if(user.hasProfiles()) {
      await Promise.all(user.profiles.map(async (profile) => {
        if(!profile.isActive) {
          const hasMetadata = await this.userStoragePort.hasMetadata(user.id, profile.id.no);
          if(hasMetadata) {
            profile.isActive = true;
            await this.userRepository.updateUserAttachmentActive(user.id, profile.id.no, true);
          } else {
            profile.isActive = false;
            await this.userRepository.deleteUserAttachment(user.id, profile.id.no);
          }
        }
        user.removeUnActiveProfiles()
      }))
    }
    console.log(user)
    return user;
  }
}
