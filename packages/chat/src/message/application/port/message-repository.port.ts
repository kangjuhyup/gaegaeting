import type { ChatMessage, MessageCursor, MessagePage } from '../../domain/model/message.js';
export abstract class MessageRepositoryPort {
  abstract messages(roomId: number, userId: string, cursor: MessageCursor): Promise<MessagePage>;
  /** Authorization, deduplication, append and last-message update are atomic. */
  abstract send(roomId: number, userId: string, body: string, clientMessageId: string): Promise<ChatMessage>;
}
