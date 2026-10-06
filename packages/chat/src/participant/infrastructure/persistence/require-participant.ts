import { NotFoundException } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
export async function requireParticipant(client: Pool | PoolClient, roomId: number, userId: string, lock = false) {
    const result = await client.query(`select c.id from conversation c
      join participant p on p.conversation_id = c.id
      where c.id = $1 and p.user_id = $2 and p.left_at is null ${lock ? 'for update of c' : ''}`, [roomId, userId]);
    if (!result.rowCount) throw new NotFoundException('대화를 찾을 수 없습니다.');
  }
