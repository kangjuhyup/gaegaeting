import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { RoomRepositoryPort } from '../../application/port/room-repository.port.js';
import type { ChatPair, ChatRoom } from '../../domain/model/room.js';
import { ChatPostgresConnection } from '../../../common/infrastructure/postgres-connection.js';
import { toMessage } from '../../../message/infrastructure/persistence/message.mapper.js';
@Injectable()
export class RoomPostgresRepository extends RoomRepositoryPort {
  constructor(private readonly connection: ChatPostgresConnection) { super(); }
  async ensureRoom(pair: ChatPair): Promise<number> {
    return this.connection.transaction(async client => {
      const result = await client.query(`insert into conversation (type, direct_key, pair_id)
        values (1, $1, $2) on conflict (pair_id) do update set pair_id = excluded.pair_id
        returning id`, [`pair:${pair.pairId}`, pair.pairId]);
      const id = result.rows[0].id;
      const existing = await client.query('select user_id from participant where conversation_id = $1', [id]);
      const expected = [pair.leftUserId, pair.rightUserId];
      if (existing.rows.some(row => !expected.includes(row.user_id.trim()))) {
        throw new ConflictException('매칭 참여자가 일치하지 않습니다.');
      }
      await client.query(`insert into participant (conversation_id, user_id, role)
        values ($1, $2, 1), ($1, $3, 2) on conflict (conversation_id, user_id) do nothing`, [id, ...expected]);
      if (!existing.rowCount) await client.query('select pg_notify($1, $2)',
        ['gaegaeting_chat', JSON.stringify({ roomId: id, kind: 'ROOM', messageId: null })]);
      return id;
    });
  }
  private async selectRooms(userId: string, roomId?: number): Promise<ChatRoom[]> {
    const result = await this.connection.pool.query(`select c.id, c.pair_id, c.created_at,
      other.user_id as other_user_id, coalesce(p.last_read_message_id, 0) as last_read,
      coalesce(other.last_read_message_id, 0) as other_last_read,
      row_to_json(last_message.*) as last_message,
      (select count(*)::int from message m where m.conversation_id = c.id
        and m.sender_id <> p.user_id and m.id > coalesce(p.last_read_message_id, 0)
        and m.deleted_at is null) as unread
      from conversation c join participant p on p.conversation_id = c.id
      join participant other on other.conversation_id = c.id and other.user_id <> p.user_id and other.left_at is null
      left join lateral (select * from message m where m.conversation_id = c.id and m.deleted_at is null
        order by m.id desc limit 1) last_message on true
      where p.user_id = $1 and p.left_at is null and ($2::int is null or c.id = $2)
      order by coalesce(c.last_message_at, c.created_at) desc, c.id desc`, [userId, roomId ?? null]);
    return result.rows.map(row => ({ id: row.id, pairId: row.pair_id, otherUserId: row.other_user_id.trim(),
      createdAt: new Date(row.created_at).toISOString(), lastMessage: row.last_message?.id ? toMessage(row.last_message) : null,
      unread: row.unread, lastReadMessageId: Number(row.last_read), otherLastReadMessageId: Number(row.other_last_read) }));
  }
  rooms(userId: string) { return this.selectRooms(userId); }
  async room(roomId: number, userId: string): Promise<ChatRoom> {
    const room = (await this.selectRooms(userId, roomId))[0];
    if (!room) throw new NotFoundException('대화를 찾을 수 없습니다.');
    return room;
  }
}
