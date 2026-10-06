import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { UserPrincipal } from '@core/auth';
import { MessageRepositoryPort } from '../port/message-repository.port.js';
import { RoomRepositoryPort } from '../../../room/application/port/room-repository.port.js';
import { MatchPairsPort } from '../../../room/application/port/match-pairs.port.js';
import type { MessageCursor } from '../../domain/model/message.js';

@Injectable()
export class MessageService {
  constructor(private readonly repository: MessageRepositoryPort, private readonly rooms: RoomRepositoryPort,
    private readonly matches: MatchPairsPort) {}
  messages(roomId: number, userId: string, cursor: MessageCursor) {
    if (!Number.isSafeInteger(cursor.limit) || cursor.limit < 1 || cursor.limit > 100 ||
        (cursor.before !== undefined && cursor.after !== undefined) ||
        [cursor.before, cursor.after].some(id => id !== undefined && (!Number.isSafeInteger(id) || id < 1 || id > 2147483647))) {
      throw new BadRequestException('유효하지 않은 메시지 조회 범위입니다.');
    }
    return this.repository.messages(roomId, userId, cursor);
  }
  async send(roomId: number, principal: UserPrincipal, input: { body?: unknown; clientMessageId?: unknown }) {
    const body = typeof input?.body === 'string' ? input.body.trim() : '';
    const clientMessageId = input?.clientMessageId;
    if (!body || body.length > 2000 || typeof clientMessageId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientMessageId)) {
      throw new BadRequestException('메시지는 1~2000자와 유효한 전송 ID가 필요합니다.');
    }
    const room = await this.rooms.room(roomId, principal.userId);
    const pairs = await this.matches.activePairs(principal);
    if (!pairs.some(pair => pair.pairId === room.pairId &&
        [pair.leftUserId, pair.rightUserId].includes(principal.userId) &&
        [pair.leftUserId, pair.rightUserId].includes(room.otherUserId))) {
      throw new ForbiddenException('종료된 매칭에는 메시지를 보낼 수 없습니다.');
    }
    return this.repository.send(roomId, principal.userId, body, clientMessageId.toLowerCase());
  }
}
