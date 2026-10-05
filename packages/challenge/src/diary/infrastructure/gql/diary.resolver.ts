import {
  GraphqlAccessGuard,
  Scopes,
  UserParam,
  type UserPrincipal,
} from "@core/auth";
import { UseGuards } from "@nestjs/common";
import { Args, ID, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import { DiaryCommands } from "../../application/diary.commands.js";
import { DiaryQueries } from "../../application/diary.queries.js";
import { PhotoService } from "../../application/photo.service.js";
import {
  MyWalkingDiaryType,
  SaveWalkingDiaryInput,
  WalkingPhotoType,
  WalkingPhotoUploadType,
  WalkingRouteDiaryReviewType,
} from "./diary.types.js";

@Resolver()
@UseGuards(GraphqlAccessGuard)
export class DiaryResolver {
  constructor(
    private readonly commands: DiaryCommands,
    private readonly queries: DiaryQueries,
    private readonly photos: PhotoService,
  ) {}
  @Query(() => MyWalkingDiaryType)
  @Scopes("challenge:read")
  myWalkingDiary(
    @UserParam() user: UserPrincipal,
    @Args("id", { type: () => ID }) id: string,
  ) {
    return this.queries.own(user.userId, id);
  }
  @Query(() => MyWalkingDiaryType, { nullable: true })
  @Scopes("challenge:read")
  myWalkDiary(
    @UserParam() user: UserPrincipal,
    @Args("walkId", { type: () => ID }) walkId: string,
  ) {
    return this.queries.byWalk(user.userId, walkId);
  }
  @Query(() => [MyWalkingDiaryType])
  @Scopes("challenge:read")
  myWalkingDiaries(
    @UserParam() user: UserPrincipal,
    @Args("limit", { type: () => Int, defaultValue: 20 }) limit: number,
    @Args("offset", { type: () => Int, defaultValue: 0 }) offset: number,
  ) {
    return this.queries.ownList(user.userId, limit, offset);
  }
  @Query(() => [WalkingRouteDiaryReviewType])
  @Scopes("challenge:read")
  walkingRouteReviews(
    @Args("routeId", { type: () => ID }) routeId: string,
    @Args("limit", { type: () => Int, defaultValue: 20 }) limit: number,
    @Args("offset", { type: () => Int, defaultValue: 0 }) offset: number,
  ) {
    return this.queries.reviews(routeId, limit, offset);
  }
  @Mutation(() => MyWalkingDiaryType)
  @Scopes("challenge:write")
  async saveWalkingDiary(
    @UserParam() user: UserPrincipal,
    @Args("input") input: SaveWalkingDiaryInput,
  ) {
    const id = await this.commands.save(
      user.userId,
      input.walkId,
      input.expectedRevision,
      { ...input, mood: input.mood ?? null },
    );
    return this.queries.own(user.userId, id);
  }
  @Mutation(() => Boolean)
  @Scopes("challenge:write")
  async deleteWalkingDiary(
    @UserParam() user: UserPrincipal,
    @Args("id", { type: () => ID }) id: string,
  ) {
    await this.commands.remove(user.userId, id);
    return true;
  }
  @Query(() => [WalkingPhotoType])
  @Scopes("challenge:read")
  myWalkingPhotos(
    @UserParam() user: UserPrincipal,
    @Args("walkId", { type: () => ID }) walkId: string,
  ) {
    return this.photos.own(user.userId, walkId);
  }
  @Mutation(() => WalkingPhotoUploadType)
  @Scopes("challenge:write")
  beginWalkingPhotoUpload(
    @UserParam() user: UserPrincipal,
    @Args("walkId", { type: () => ID }) walkId: string,
  ) {
    return this.photos.begin(user.userId, walkId);
  }
  @Mutation(() => WalkingPhotoType)
  @Scopes("challenge:write")
  completeWalkingPhotoUpload(
    @UserParam() user: UserPrincipal,
    @Args("id", { type: () => ID }) id: string,
  ) {
    return this.photos.complete(user.userId, id);
  }
  @Mutation(() => Boolean)
  @Scopes("challenge:write")
  async deleteWalkingPhoto(
    @UserParam() user: UserPrincipal,
    @Args("id", { type: () => ID }) id: string,
  ) {
    await this.commands.removePhoto(user.userId, id);
    return true;
  }
}
