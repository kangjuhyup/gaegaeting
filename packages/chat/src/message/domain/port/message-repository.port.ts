import { MessageEntity } from "../model/message";

export abstract class MessageRepositoryPort {
  abstract insertMessage(message: MessageEntity): Promise<MessageEntity>;
  abstract selectMessagesFromRoom(roomId: number, limit: number, cursor?: number): Promise<MessageEntity[]>;
  abstract selectMessageFromId(id: number): Promise<MessageEntity | null>;
  abstract updateMessage(message: MessageEntity): Promise<MessageEntity>;
  abstract deleteMessage(id: number): Promise<void>;
}