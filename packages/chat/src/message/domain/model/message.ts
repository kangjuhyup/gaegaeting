export interface ChatMessage {
  id: number; roomId: number; senderId: string; body: string;
  clientMessageId: string | null; sentAt: string;
}
export interface MessagePage { messages: ChatMessage[]; hasMore: boolean }
export interface MessageCursor { limit: number; before?: number; after?: number }
