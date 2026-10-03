import { Injectable, ConflictException } from '@nestjs/common';
import { MessageRepositoryPort } from '../../application/port/message-repository.port.js';
import type { ChatMessage, MessageCursor, MessagePage } from '../../domain/model/message.js';
import { ChatPostgresConnection } from '../../../common/infrastructure/postgres-connection.js';
import { requireParticipant } from '../../../participant/infrastructure/persistence/require-participant.js';
import { toMessage } from './message.mapper.js';
@Injectable()
export class MessagePostgresRepository extends MessageRepositoryPort {
  constructor(private readonly connection: ChatPostgresConnection) { super(); }
  async messages(roomId: number, userId: string, cursor: MessageCursor): Promise<MessagePage> {
    await requireParticipant(this.connection.pool, roomId, userId);
    const ascending = cursor.after !== undefined;
    const result = await this.connection.pool.query(`select * from message where conversation_id = $1 and deleted_at is null
      and ($2::int is null or id < $2) and ($3::int is null or id > $3)
      order by id ${ascending ? 'asc' : 'desc'} limit $4`, [roomId, cursor.before ?? null, cursor.after ?? null, cursor.limit + 1]);
    const messages = result.rows.slice(0, cursor.limit).map(toMessage);
    return { messages: ascending ? messages : messages.reverse(), hasMore: result.rows.length > cursor.limit };
  }
  async send(roomId: number, userId: string, body: string, clientMessageId: string): Promise<ChatMessage> {
    return this.connection.transaction(async client => {
      // Allocate the serial ID only after locking: a polling cursor cannot miss a late commit in this room.
      await requireParticipant(client, roomId, userId, true);
      const existing = await client.query(`select * from message where conversation_id = $1
        and sender_id = $2 and client_message_id = $3`, [roomId, userId, clientMessageId]);
      if (existing.rowCount) {
        if (existing.rows[0].body !== body) throw new ConflictException('이미 사용된 전송 ID입니다.');
        return toMessage(existing.rows[0]);
      }
      const result = await client.query(`insert into message (conversation_id, sender_id, body, client_message_id)
        values ($1, $2, $3, $4) returning *`, [roomId, userId, body, clientMessageId]);
      await client.query('update conversation set last_message_at = $2, updated_at = current_timestamp where id = $1', [roomId, result.rows[0].sent_at]);
      await client.query('select pg_notify($1, $2)', ['gaegaeting_chat',
        JSON.stringify({ roomId, kind: 'MESSAGE', messageId: result.rows[0].id })]);
      return toMessage(result.rows[0]);
    });
  }
}
