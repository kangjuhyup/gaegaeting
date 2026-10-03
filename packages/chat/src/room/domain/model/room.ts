import type { ChatMessage } from '../../../message/domain/model/message.js';
export interface ChatPair { pairId: number; leftUserId: string; rightUserId: string }
export interface ChatRoom {
  id: number; pairId: number | null; otherUserId: string;
  createdAt: string; lastMessage: ChatMessage | null; unread: number;
  lastReadMessageId: number; otherLastReadMessageId: number;
}
