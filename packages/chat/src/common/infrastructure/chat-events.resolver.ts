import { Args, Field, Int, ObjectType, Resolver, Subscription } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphqlAccessGuard, Scopes, UserParam, type UserPrincipal } from '@core/auth';
import { ChatRealtimeService } from '../application/chat-realtime.service.js';
@ObjectType('ChatEvent')
export class ChatEventType {
  @Field(() => Int, { nullable: true }) roomId?: number | null;
  @Field() kind!: string;
  @Field(() => Int, { nullable: true }) messageId?: number | null;
}
@Resolver()
@UseGuards(GraphqlAccessGuard)
export class ChatEventsResolver {
  constructor(private readonly realtime: ChatRealtimeService) {}
  @Subscription(() => ChatEventType, { resolve: value => value }) @Scopes('match:read')
  chatEvents(@UserParam() user: UserPrincipal,
    @Args('roomId', { type: () => Int, nullable: true }) roomId?: number) {
    return this.realtime.watch(user.userId, roomId);
  }
}
