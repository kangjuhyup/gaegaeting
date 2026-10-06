import {
  GraphqlAccessGuard,
  Scopes,
  UserParam,
  type UserPrincipal,
} from "@core/auth";
import { UseGuards } from "@nestjs/common";
import {
  Args,
  GraphQLISODateTime,
  ID,
  Int,
  Mutation,
  Query,
  Resolver,
} from "@nestjs/graphql";
import { WalkCommands } from "../../application/walk.commands.js";
import { WalkQueries } from "../../application/walk.queries.js";
import {
  AppendWalkPointsInput,
  StartWalkInput,
  WalkingPassportStampType,
  WalkingRecordType,
} from "./walk.types.js";

@Resolver()
@UseGuards(GraphqlAccessGuard)
export class WalkResolver {
  constructor(
    private readonly commands: WalkCommands,
    private readonly queries: WalkQueries,
  ) {}
  @Query(() => WalkingRecordType)
  @Scopes("challenge:read")
  myWalk(
    @UserParam() user: UserPrincipal,
    @Args("id", { type: () => ID }) id: string,
  ) {
    return this.queries.own(user.userId, id);
  }
  @Query(() => WalkingRecordType, { nullable: true })
  @Scopes("challenge:read")
  myCurrentWalk(@UserParam() user: UserPrincipal) {
    return this.queries.current(user.userId);
  }
  @Query(() => [WalkingRecordType])
  @Scopes("challenge:read")
  myWalks(
    @UserParam() user: UserPrincipal,
    @Args("limit", { type: () => Int, defaultValue: 20 }) limit: number,
    @Args("offset", { type: () => Int, defaultValue: 0 }) offset: number,
  ) {
    return this.queries.list(user.userId, limit, offset);
  }
  @Query(() => [WalkingPassportStampType])
  @Scopes("challenge:read")
  myWalkingPassport(@UserParam() user: UserPrincipal) {
    return this.queries.passport(user.userId);
  }
  @Mutation(() => WalkingRecordType)
  @Scopes("challenge:write")
  async startWalk(
    @UserParam() user: UserPrincipal,
    @Args("input") input: StartWalkInput,
  ) {
    return this.queries.own(
      user.userId,
      await this.commands.start(
        user,
        input.requestId,
        input.petIds,
        input.routeId ?? null,
      ),
    );
  }
  @Mutation(() => WalkingRecordType)
  @Scopes("challenge:write")
  async appendWalkPoints(
    @UserParam() user: UserPrincipal,
    @Args("input") input: AppendWalkPointsInput,
  ) {
    await this.commands.append(
      user.userId,
      input.walkId,
      input.fromIndex,
      input.points,
    );
    return this.queries.own(user.userId, input.walkId);
  }
  @Mutation(() => WalkingRecordType)
  @Scopes("challenge:write")
  async setWalkPaused(
    @UserParam() user: UserPrincipal,
    @Args("id", { type: () => ID }) id: string,
    @Args("paused") paused: boolean,
  ) {
    await this.commands.pause(user.userId, id, paused);
    return this.queries.own(user.userId, id);
  }
  @Mutation(() => WalkingRecordType)
  @Scopes("challenge:write")
  async finishWalk(
    @UserParam() user: UserPrincipal,
    @Args("id", { type: () => ID }) id: string,
    @Args("endedAt", { type: () => GraphQLISODateTime }) endedAt: Date,
  ) {
    await this.commands.finish(user.userId, id, endedAt);
    return this.queries.own(user.userId, id);
  }
  @Mutation(() => Boolean)
  @Scopes("challenge:write")
  async deleteWalk(
    @UserParam() user: UserPrincipal,
    @Args("id", { type: () => ID }) id: string,
  ) {
    await this.commands.remove(user.userId, id);
    return true;
  }
}
