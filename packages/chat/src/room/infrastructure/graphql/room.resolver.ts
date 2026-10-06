import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphqlAccessGuard, Scopes, UserParam, type UserPrincipal } from '@core/auth';
import { RoomService } from '../../application/service/room.service.js';
import { ChatRoomType } from './room.type.js';
@Resolver()
@UseGuards(GraphqlAccessGuard)
export class RoomResolver {
  constructor(private readonly rooms: RoomService) {}
  @Query(() => [ChatRoomType]) @Scopes('match:read')
  chatRooms(@UserParam() user: UserPrincipal) { return this.rooms.rooms(user.userId); }
  @Mutation(() => [ChatRoomType]) @Scopes('match:read')
  syncChatRooms(@UserParam() user: UserPrincipal) { return this.rooms.syncRooms(user); }
  @Query(() => ChatRoomType) @Scopes('match:read')
  chatRoom(@Args('roomId', { type: () => Int }) roomId: number, @UserParam() user: UserPrincipal) {
    return this.rooms.room(roomId, user.userId);
  }
}
