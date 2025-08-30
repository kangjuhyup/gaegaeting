import { MessageEntity } from "@app/message/domain/model/message";
import { Query } from "@nestjs/cqrs";

export class GetMessagesQuery extends Query<MessageEntity[]> {
  constructor(
    public readonly roomId: number,
    public readonly limit: number = 20,
    public readonly cursor?: number
  ) {
    super();
  }
}