import type { QueryResultRow } from 'pg';
import type { ChatMessage } from '../../domain/model/message.js';
export function toMessage(row: QueryResultRow): ChatMessage {
  return { id: row.id, roomId: row.conversation_id, senderId: row.sender_id.trim(),
    body: row.body, clientMessageId: row.client_message_id ?? null,
    sentAt: new Date(row.sent_at).toISOString() };
}
