import { Args, Field, Int, Mutation, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { BadRequestException, UseGuards } from '@nestjs/common';
import { GraphqlAccessGuard, Roles, Scopes, UserParam, type UserPrincipal } from '@core/auth';
import { ProfileImageService } from './profile-image.service.js';
import type { ImageKind } from './profile-image-repository.port.js';

@ObjectType()
export class ProfileImageUpload {
  @Field() kind: string;
  @Field() targetId: string;
  @Field(() => Int) imageNo: number;
  @Field() status: string;
  @Field({ nullable: true }) url?: string;
  @Field() updatedAt: Date;
}

@Resolver()
@UseGuards(GraphqlAccessGuard)
export class ProfileImageResolver {
  constructor(private readonly images: ProfileImageService) {}
  private kind(value: string): ImageKind {
    if (value !== 'USER' && value !== 'PET') throw new BadRequestException('잘못된 사진 유형입니다.');
    return value;
  }

  @Query(() => Boolean)
  @Scopes('account:read')
  canReviewProfileImages(@UserParam() user: UserPrincipal) {
    return user.roles?.includes('ADMIN') === true && user.scopes.includes('account:write');
  }

  @Query(() => [ProfileImageUpload])
  @Scopes('account:read')
  myProfileImageUploads(@UserParam() user: UserPrincipal) { return this.images.own('USER', user.userId, user.userId); }

  @Query(() => [ProfileImageUpload])
  @Scopes('account:read')
  myPetImageUploads(@UserParam() user: UserPrincipal, @Args('petId', { type: () => Int }) petId: number) {
    return this.images.own('PET', String(petId), user.userId);
  }

  @Mutation(() => ProfileImageUpload)
  @Scopes('account:write')
  completeProfileImage(@UserParam() user: UserPrincipal, @Args('imageNo', { type: () => Int }) imageNo: number) {
    return this.images.complete('USER', user.userId, imageNo, user.userId);
  }

  @Mutation(() => ProfileImageUpload)
  @Scopes('account:write')
  completePetImage(@UserParam() user: UserPrincipal, @Args('petId', { type: () => Int }) petId: number, @Args('imageNo', { type: () => Int }) imageNo: number) {
    return this.images.complete('PET', String(petId), imageNo, user.userId);
  }

  @Query(() => [ProfileImageUpload])
  @Roles('ADMIN')
  @Scopes('account:read')
  adminPendingProfileImages(@Args('limit', { type: () => Int, nullable: true }) limit?: number) { return this.images.pending(limit ?? 50); }

  @Mutation(() => Boolean)
  @Roles('ADMIN')
  @Scopes('account:write')
  reviewProfileImage(@UserParam() user: UserPrincipal, @Args('kind') kind: string, @Args('targetId') targetId: string,
    @Args('imageNo', { type: () => Int }) imageNo: number, @Args('approve') approve: boolean) {
    return this.images.review(this.kind(kind), targetId, imageNo, approve, user.userId);
  }
}
