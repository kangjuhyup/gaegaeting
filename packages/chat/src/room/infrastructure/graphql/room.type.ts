import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ChatMessageType } from '../../../message/infrastructure/graphql/message.type.js';
@ObjectType('ChatRoom')
export class ChatRoomType {
  @Field(() => Int) id!: number;
  @Field(() => Int, { nullable: true }) pairId?: number | null;
  @Field() otherUserId!: string;
  @Field() createdAt!: string;
  @Field(() => ChatMessageType, { nullable: true }) lastMessage?: ChatMessageType | null;
  @Field(() => Int) unread!: number;
  @Field(() => Int) lastReadMessageId!: number;
  @Field(() => Int) otherLastReadMessageId!: number;
}
