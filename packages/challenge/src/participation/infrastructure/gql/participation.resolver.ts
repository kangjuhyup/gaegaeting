import {
  GraphqlAccessGuard,
  Scopes,
  UserParam,
  type UserPrincipal,
} from "@core/auth";
import { UseGuards } from "@nestjs/common";
import { Args, ID, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import { ParticipationCommands } from "../../application/participation.commands.js";
import { ParticipationQueries } from "../../application/participation.queries.js";
import {
  ChallengeParticipationType,
  JoinChallengeInput,
} from "./participation.types.js";

@Resolver()
@UseGuards(GraphqlAccessGuard)
export class ParticipationResolver {
  constructor(
    private readonly commands: ParticipationCommands,
    private readonly queries: ParticipationQueries,
  ) {}

  @Query(() => [ChallengeParticipationType])
  @Scopes("challenge:read")
  myChallenges(
    @UserParam() user: UserPrincipal,
    @Args("limit", { type: () => Int, defaultValue: 20 }) limit: number,
  ) {
    return this.queries.enrollments(user.userId, limit);
  }

  @Query(() => ChallengeParticipationType)
  @Scopes("challenge:read")
  myChallenge(
    @UserParam() user: UserPrincipal,
    @Args("id", { type: () => ID }) id: string,
  ) {
    return this.queries.enrollment(user.userId, id);
  }

  @Mutation(() => ChallengeParticipationType)
  @Scopes("challenge:write")
  async joinChallenge(
    @UserParam() user: UserPrincipal,
    @Args("input") input: JoinChallengeInput,
  ) {
    const id = await this.commands.join(
      user.userId,
      input.kind,
      input.requestId,
    );
    return this.queries.enrollment(user.userId, id);
  }

  @Mutation(() => Boolean)
  @Scopes("challenge:write")
  async cancelChallenge(
    @UserParam() user: UserPrincipal,
    @Args("id", { type: () => ID }) id: string,
  ) {
    await this.commands.cancel(user.userId, id);
    return true;
  }
}
