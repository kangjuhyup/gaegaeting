import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
@ObjectType('ChatMessage')
export class ChatMessageType {
  @Field(() => Int) id!: number;
  @Field(() => Int) roomId!: number;
  @Field() senderId!: string;
  @Field() body!: string;
  @Field({ nullable: true }) clientMessageId?: string | null;
  @Field() sentAt!: string;
}
@ObjectType('ChatMessagePage')
export class ChatMessagePageType {
  @Field(() => [ChatMessageType]) messages!: ChatMessageType[];
  @Field() hasMore!: boolean;
}
@InputType()
export class ChatMessageCursorInput {
  @Field(() => Int, { defaultValue: 50 }) limit = 50;
  @Field(() => Int, { nullable: true }) before?: number;
  @Field(() => Int, { nullable: true }) after?: number;
}
@InputType()
export class SendChatMessageInput {
  @Field(() => Int) roomId!: number;
  @Field() body!: string;
  @Field() clientMessageId!: string;
}
