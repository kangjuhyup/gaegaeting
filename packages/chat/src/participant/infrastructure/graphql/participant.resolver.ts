import { Args, Int, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphqlAccessGuard, Scopes, UserParam, type UserPrincipal } from '@core/auth';
import { ParticipantService } from '../../application/service/participant.service.js';
@Resolver()
@UseGuards(GraphqlAccessGuard)
export class ParticipantResolver {
  constructor(private readonly participants: ParticipantService) {}
  @Mutation(() => Boolean) @Scopes('match:read')
  async markChatRead(@Args('roomId', { type: () => Int }) roomId: number,
    @Args('messageId', { type: () => Int }) messageId: number, @UserParam() user: UserPrincipal) {
    await this.participants.read(roomId, user.userId, messageId);
    return true;
  }
}
