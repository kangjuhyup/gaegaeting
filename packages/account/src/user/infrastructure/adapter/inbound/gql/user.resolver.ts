import { Int, Resolver, Query, Mutation, Args, Parent, ResolveField } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UserParam, UserPrincipal, GraphqlAccessGuard } from '@core/auth';
import { CreateUserProfileCommand } from '@app/user/application/port/command/create-user-profile.port';
import { UpdateUserProfileCommand } from '@app/user/application/port/command/update-user-profile.port';
import { GetUserProfileQuery } from '@app/user/application/port/query/get-user-profile.port';
import { GenerateUserPresignedCommand } from '@app/user/application/port/command/generate-presigned.port';
import { DeleteProfileImageCommand } from '@app/user/application/port/command/delete-profile-image.port';
import { PresignedUrl } from '@app/common/graphql/dto/presigned-url.type';
import { UserGraphQLDto } from './dto/user.graphql.dto';
import { CreateUserProfileInput, UpdateUserProfileInput } from './dto/user.input';
import { UserProfile } from './dto/user.type';
import { PetsByUserIdLoader } from './dataloader/pets-by-user-id.loader';
import { Pet } from '@app/pet/infrastructure/adapter/inbound/gql/dto/pet.type';
import { PetGraphQLDto } from '@app/pet/infrastructure/adapter/inbound/gql/dto/pet.graphql.dto';
import { UserAttachment } from './dto/user-attachment.type';
import { UserAttachmentsByUserIdLoader } from './dataloader/user-attachments-by-user-id.loader';

@Resolver(() => UserProfile)
export class UserResolver {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
    private readonly petsByUserIdLoader: PetsByUserIdLoader,
    private readonly userAttachmentsByUserIdLoader: UserAttachmentsByUserIdLoader,
  ) {}

  @Query(() => UserProfile)
  @UseGuards(GraphqlAccessGuard)
  async myProfile(@UserParam() user: UserPrincipal): Promise<UserProfile> {
    const userProfile = await this.queryBus.execute(new GetUserProfileQuery(user.userId));
    return UserGraphQLDto.fromDomain(userProfile.profile, userProfile.profileImages);
  }

  @Query(() => UserProfile, { nullable: true })
  async profile(@Args('id', { type: () => String }) id: string): Promise<UserProfile | null> {
    const user = await this.queryBus.execute(new GetUserProfileQuery(id));
    return user ? UserGraphQLDto.fromDomain(user.profile, user.profileImages) : null;
  }

  @ResolveField(() => [Pet], { nullable: 'itemsAndList' })
  async pets(@Parent() user: UserProfile): Promise<Pet[]> {
    const pets = await this.petsByUserIdLoader.load(user.id);
    return pets.map(({ pet, profile }) =>
      PetGraphQLDto.fromDomain(pet, profile.map((p) => p.path)),
    );
  }

  @ResolveField(() => [UserAttachment], { nullable: 'itemsAndList' })
  async attachments(@Parent() user: UserProfile): Promise<UserAttachment[]> {
    const attachments = await this.userAttachmentsByUserIdLoader.load(user.id);
    return attachments.map((a) => ({
      userId: a.id.userId,
      no: a.id.no,
      path: a.path,
      active: a.active,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  }

  @Mutation(() => UserProfile)
  @UseGuards(GraphqlAccessGuard)
  async createProfile(
    @UserParam() user: UserPrincipal,
    @Args('input') input: CreateUserProfileInput,
  ): Promise<UserProfile> {
    const userData = UserGraphQLDto.toDomainEntity(input);
    const profile = await this.commandBus.execute(
      new CreateUserProfileCommand(user, userData),
    );
    return UserGraphQLDto.fromDomain(profile);
  }

  @Mutation(() => UserProfile)
  @UseGuards(GraphqlAccessGuard)
  async updateProfile(
    @Args('id', { type: () => String }) id: string,
    @Args('input') input: UpdateUserProfileInput,
  ): Promise<UserProfile> {
    const updateData = UserGraphQLDto.toUpdateData(input);
    const user = await this.commandBus.execute(new UpdateUserProfileCommand(id, updateData));
    return UserGraphQLDto.fromDomain(user);
  }

  @Mutation(() => PresignedUrl)
  @UseGuards(GraphqlAccessGuard)
  async generatePresignedUrl(
    @UserParam() user: UserPrincipal,
    @Args('imageNo', { type: () => Int }) imageNo: number,
  ): Promise<PresignedUrl> {
    const presignedUrl = await this.commandBus.execute(
      new GenerateUserPresignedCommand(user.userId, imageNo),
    );
    return UserGraphQLDto.fromPresignedUrl(presignedUrl);
  }

  @Mutation(() => Boolean)
  @UseGuards(GraphqlAccessGuard)
  async deleteProfileImage(
    @UserParam() user: UserPrincipal,
    @Args('imageNo', { type: () => Int }) imageNo: number,
  ): Promise<boolean> {
    await this.commandBus.execute(new DeleteProfileImageCommand(user.userId, imageNo));
    return true;
  }
}

