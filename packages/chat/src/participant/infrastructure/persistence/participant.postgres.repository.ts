import { Injectable, BadRequestException } from '@nestjs/common';
import { ParticipantRepositoryPort } from '../../application/port/participant-repository.port.js';
import type { ParticipantReadState } from '../../domain/model/participant.js';
import { ChatPostgresConnection } from '../../../common/infrastructure/postgres-connection.js';
import { requireParticipant } from './require-participant.js';
@Injectable()
export class ParticipantPostgresRepository extends ParticipantRepositoryPort {
  constructor(private readonly connection: ChatPostgresConnection) { super(); }
  async read(roomId: number, userId: string, messageId: number): Promise<ParticipantReadState> {
    return this.connection.transaction(async client => {
      await requireParticipant(client, roomId, userId, true);
      const target = await client.query('select id from message where conversation_id = $1 and id = $2 and deleted_at is null', [roomId, messageId]);
      if (!target.rowCount) throw new BadRequestException('이 대화의 메시지만 읽음 처리할 수 있습니다.');
      const updated = await client.query(`update participant set last_read_message_id = $3, last_read_at = current_timestamp,
        updated_at = current_timestamp where conversation_id = $1 and user_id = $2
        and coalesce(last_read_message_id, 0) < $3`, [roomId, userId, messageId]);
      if (updated.rowCount) await client.query('select pg_notify($1, $2)', ['gaegaeting_chat',
        JSON.stringify({ roomId, kind: 'READ', messageId })]);
      const result = await client.query('select * from participant where conversation_id = $1 and user_id = $2', [roomId, userId]);
      const row = result.rows[0];
      return { roomId, userId, lastReadMessageId: Number(row.last_read_message_id),
        lastReadAt: row.last_read_at ? new Date(row.last_read_at).toISOString() : null };
    });
  }
}
