import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphqlAccessGuard, Scopes, UserParam, type UserPrincipal } from '@core/auth';
import { MessageService } from '../../application/service/message.service.js';
import { ChatMessagePageType, ChatMessageType, ChatMessageCursorInput, SendChatMessageInput } from './message.type.js';
@Resolver()
@UseGuards(GraphqlAccessGuard)
export class MessageResolver {
  constructor(private readonly messages: MessageService) {}
  @Query(() => ChatMessagePageType) @Scopes('match:read')
  chatMessages(@Args('roomId', { type: () => Int }) roomId: number, @UserParam() user: UserPrincipal,
    @Args('cursor', { type: () => ChatMessageCursorInput, nullable: true }) cursor?: ChatMessageCursorInput) {
    return this.messages.messages(roomId, user.userId, { limit: cursor?.limit ?? 50, before: cursor?.before ?? undefined, after: cursor?.after ?? undefined });
  }
  @Mutation(() => ChatMessageType) @Scopes('match:write')
  sendChatMessage(@Args('input') input: SendChatMessageInput, @UserParam() user: UserPrincipal) {
    return this.messages.send(input.roomId, user, input);
  }
}
