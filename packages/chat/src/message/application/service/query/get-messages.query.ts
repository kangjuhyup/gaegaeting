import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { GetMessagesQuery } from "../../port/query/get-messages.port";
import { MessageEntity } from "@app/message/domain/model/message";
import { MessageRepositoryPort } from "@app/message/domain/port/message-repository.port";
import { RoomRepositoryPort } from "@app/room/domain/port/room-repository.port";

@QueryHandler(GetMessagesQuery)
export class GetMessagesHandler implements IQueryHandler<GetMessagesQuery, MessageEntity[]> {
  constructor(
    private readonly messageRepository: MessageRepositoryPort,
    private readonly roomRepository: RoomRepositoryPort
  ) {}

  async execute(query: GetMessagesQuery): Promise<MessageEntity[]> {
    // Verify room exists
    const room = await this.roomRepository.selectRoomFromId(query.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    return await this.messageRepository.selectMessagesFromRoom(
      query.roomId,
      query.limit,
      query.cursor
    );
  }
}