import { MessageEntity } from "@app/message/domain/model/message";
import { Command } from "@nestjs/cqrs";

export class SendMessageCommand extends Command<MessageEntity> {
  constructor(
    public readonly roomId: number,
    public readonly senderId: string,
    public readonly body: string
  ) {
    super();
  }
}