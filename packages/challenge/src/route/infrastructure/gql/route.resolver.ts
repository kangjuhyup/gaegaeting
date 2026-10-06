import {
  GraphqlAccessGuard,
  Roles,
  Scopes,
  UserParam,
  type UserPrincipal,
} from "@core/auth";
import { UseGuards } from "@nestjs/common";
import { Args, ID, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import { RouteCommands } from "../../application/route.commands.js";
import { RouteQueries } from "../../application/route.queries.js";
import {
  CreateWalkingRouteInput,
  MyWalkingRouteType,
  WalkingRouteDetailsInput,
  WalkingRouteReportType,
  WalkingRouteReviewItemType,
  WalkingRouteSearchInput,
  WalkingRouteType,
} from "./route.types.js";

@Resolver()
@UseGuards(GraphqlAccessGuard)
export class RouteResolver {
  constructor(
    private readonly commands: RouteCommands,
    private readonly queries: RouteQueries,
  ) {}
  @Query(() => WalkingRouteType)
  @Scopes("challenge:read")
  walkingRoute(
    @UserParam() user: UserPrincipal,
    @Args("id", { type: () => ID }) id: string,
  ) {
    return this.queries.published(id, user.userId);
  }
  @Query(() => [WalkingRouteType])
  @Scopes("challenge:read")
  walkingRoutes(
    @UserParam() user: UserPrincipal,
    @Args("input") input: WalkingRouteSearchInput,
  ) {
    return this.queries.search(user.userId, {
      ...input,
      isLoop: input.isLoop ?? undefined,
      minDistanceMeters: input.minDistanceMeters ?? undefined,
      maxDistanceMeters: input.maxDistanceMeters ?? undefined,
    });
  }
  @Query(() => MyWalkingRouteType)
  @Scopes("challenge:read")
  myWalkingRoute(
    @UserParam() user: UserPrincipal,
    @Args("id", { type: () => ID }) id: string,
  ) {
    return this.queries.own(id, user.userId);
  }
  @Query(() => [MyWalkingRouteType])
  @Scopes("challenge:read")
  myWalkingRoutes(
    @UserParam() user: UserPrincipal,
    @Args("limit", { type: () => Int, defaultValue: 20 }) limit: number,
    @Args("offset", { type: () => Int, defaultValue: 0 }) offset: number,
  ) {
    return this.queries.ownList(user.userId, limit, offset);
  }
  @Query(() => [WalkingRouteType])
  @Scopes("challenge:read")
  myBookmarkedWalkingRoutes(
    @UserParam() user: UserPrincipal,
    @Args("limit", { type: () => Int, defaultValue: 20 }) limit: number,
    @Args("offset", { type: () => Int, defaultValue: 0 }) offset: number,
  ) {
    return this.queries.bookmarks(user.userId, limit, offset);
  }
  @Mutation(() => MyWalkingRouteType)
  @Scopes("challenge:write")
  async createWalkingRoute(
    @UserParam() user: UserPrincipal,
    @Args("input") input: CreateWalkingRouteInput,
  ) {
    return this.queries.own(
      await this.commands.create(
        user.userId,
        input.requestId,
        input.walkId,
        input.fromIndex,
        input.toIndex,
        input.details,
      ),
      user.userId,
    );
  }
  @Mutation(() => MyWalkingRouteType)
  @Scopes("challenge:write")
  async updateWalkingRoute(
    @UserParam() user: UserPrincipal,
    @Args("id", { type: () => ID }) id: string,
    @Args("revision", { type: () => Int }) revision: number,
    @Args("input") input: WalkingRouteDetailsInput,
  ) {
    await this.commands.update(user.userId, id, revision, input);
    return this.queries.own(id, user.userId);
  }
  @Mutation(() => MyWalkingRouteType)
  @Scopes("challenge:write")
  async submitWalkingRoute(
    @UserParam() user: UserPrincipal,
    @Args("id", { type: () => ID }) id: string,
  ) {
    await this.commands.submit(user.userId, id);
    return this.queries.own(id, user.userId);
  }
  @Mutation(() => MyWalkingRouteType)
  @Scopes("challenge:write")
  async withdrawWalkingRoute(
    @UserParam() user: UserPrincipal,
    @Args("id", { type: () => ID }) id: string,
  ) {
    await this.commands.withdraw(user.userId, id);
    return this.queries.own(id, user.userId);
  }
  @Mutation(() => Boolean)
  @Scopes("challenge:write")
  async bookmarkWalkingRoute(
    @UserParam() user: UserPrincipal,
    @Args("id", { type: () => ID }) id: string,
    @Args("saved") saved: boolean,
  ) {
    await this.commands.bookmark(user.userId, id, saved);
    return true;
  }
  @Mutation(() => Boolean)
  @Scopes("challenge:write")
  async reportWalkingRoute(
    @UserParam() user: UserPrincipal,
    @Args("id", { type: () => ID }) id: string,
    @Args("reason") reason: string,
    @Args("detail", { defaultValue: "" }) detail: string,
  ) {
    await this.commands.report(user.userId, id, reason, detail);
    return true;
  }
  @Query(() => [WalkingRouteReviewItemType])
  @Roles("ADMIN")
  @Scopes("challenge:read")
  pendingWalkingRoutes(
    @Args("limit", { type: () => Int, defaultValue: 20 }) limit: number,
    @Args("offset", { type: () => Int, defaultValue: 0 }) offset: number,
  ) {
    return this.queries.pending(limit, offset);
  }
  @Query(() => WalkingRouteReviewItemType)
  @Roles("ADMIN")
  @Scopes("challenge:read")
  walkingRouteReviewItem(@Args("id", { type: () => ID }) id: string) {
    return this.queries.reviewItem(id);
  }
  @Query(() => [WalkingRouteReportType])
  @Roles("ADMIN")
  @Scopes("challenge:read")
  walkingRouteReports(
    @Args("limit", { type: () => Int, defaultValue: 20 }) limit: number,
    @Args("offset", { type: () => Int, defaultValue: 0 }) offset: number,
  ) {
    return this.queries.reports(limit, offset);
  }
  @Mutation(() => Boolean)
  @Roles("ADMIN")
  @Scopes("challenge:write")
  async reviewWalkingRoute(
    @Args("id", { type: () => ID }) id: string,
    @Args("revision", { type: () => Int }) revision: number,
    @Args("decision") decision: string,
    @Args("reason", { defaultValue: "" }) reason: string,
  ) {
    await this.commands.review(
      id,
      revision,
      decision as "PUBLISH" | "REJECT" | "WITHDRAW",
      reason,
    );
    return true;
  }
  @Mutation(() => Boolean)
  @Roles("ADMIN")
  @Scopes("challenge:write")
  async resolveWalkingRouteReports(@Args("id", { type: () => ID }) id: string) {
    await this.commands.resolveReports(id);
    return true;
  }
}
