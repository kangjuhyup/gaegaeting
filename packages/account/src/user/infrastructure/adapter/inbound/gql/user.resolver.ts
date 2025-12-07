import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UserParam, UserPrincipal, GraphqlAuthGuard } from '@core/auth';
import { CreateUserProfileCommand } from '@app/user/application/port/command/create-user-profile.port';
import { UpdateUserProfileCommand } from '@app/user/application/port/command/update-user-profile.port';
import { GetUserProfileQuery } from '@app/user/application/port/query/get-user-profile.port';
import { GenerateUserPresignedCommand } from '@app/user/application/port/command/generate-presigned.port';
import { DeleteProfileImageCommand } from '@app/user/application/port/command/delete-profile-image.port';
import { UserProfileEntity } from '@app/user/domain/model/user-profile';
import { User as GraphQLUser, PresignedUrl, CreateUserProfileInput, UpdateUserProfileInput } from './graphql';
import { UserGraphQLDto } from './dto/user.graphql.dto';

@Resolver('User')
export class UserResolver {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Query()
  @UseGuards(GraphqlAuthGuard)
  async me(@UserParam() user: UserPrincipal): Promise<GraphQLUser> {
    const userProfile = await this.queryBus.execute(new GetUserProfileQuery(user.userId));
    return UserGraphQLDto.fromDomain(userProfile.profile, userProfile.profileImages);
  }

  @Query()
  async user(@Args('id') id: string): Promise<GraphQLUser | null> {
    const user = await this.queryBus.execute(new GetUserProfileQuery(id));
    return user ? UserGraphQLDto.fromDomain(user.profile, user.profileImages) : null;
  }

  @Mutation()
  @UseGuards(GraphqlAuthGuard)
  async createProfile(
    @UserParam() user: UserPrincipal,
    @Args('input') input: CreateUserProfileInput,
  ): Promise<GraphQLUser> {
    const userData = UserGraphQLDto.toDomainEntity(input);
    const userProfileEntity = UserProfileEntity.of(userData, user.userId);
    const profile = await this.commandBus.execute(
      new CreateUserProfileCommand(user, userProfileEntity),
    );
    return UserGraphQLDto.fromDomain(profile);
  }

  @Mutation()
  @UseGuards(GraphqlAuthGuard)
  async updateProfile(
    @Args('id') id: string,
    @Args('input') input: UpdateUserProfileInput,
  ): Promise<GraphQLUser> {
    const updateData = UserGraphQLDto.toUpdateData(input);
    const user = await this.commandBus.execute(new UpdateUserProfileCommand(id, updateData));
    return UserGraphQLDto.fromDomain(user);
  }

  @Mutation()
  @UseGuards(GraphqlAuthGuard)
  async generatePresignedUrl(
    @UserParam() user: UserPrincipal,
    @Args('imageNo') imageNo: number,
  ): Promise<PresignedUrl> {
    const presignedUrl = await this.commandBus.execute(
      new GenerateUserPresignedCommand(user.userId, imageNo),
    );
    return UserGraphQLDto.fromPresignedUrl(presignedUrl);
  }

  @Mutation()
  @UseGuards(GraphqlAuthGuard)
  async deleteProfileImage(
    @UserParam() user: UserPrincipal,
    @Args('imageNo') imageNo: number,
  ): Promise<boolean> {
    await this.commandBus.execute(new DeleteProfileImageCommand(user.userId, imageNo));
    return true;
  }
}

