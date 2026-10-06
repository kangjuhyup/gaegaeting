import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { UserPrincipal } from '@core/auth';
import { RoomRepositoryPort } from '../port/room-repository.port.js';
import { MatchPairsPort } from '../port/match-pairs.port.js';
import type { ChatPair } from '../../domain/model/room.js';

export function validatePair(value: unknown): ChatPair {
  const pair = value as ChatPair;
  const userId = /^[0-9A-HJKMNP-TV-Z]{26}$/;
  if (!pair || !Number.isSafeInteger(pair.pairId) || pair.pairId < 1 || pair.pairId > 2147483647 ||
      !userId.test(pair.leftUserId) || !userId.test(pair.rightUserId) || pair.leftUserId === pair.rightUserId) {
    throw new BadRequestException('유효하지 않은 매칭입니다.');
  }
  return { pairId: pair.pairId, leftUserId: pair.leftUserId, rightUserId: pair.rightUserId };
}

@Injectable()
export class RoomService {
  constructor(private readonly repository: RoomRepositoryPort, private readonly matches: MatchPairsPort) {}
  createPairRoom(pair: unknown) { return this.repository.ensureRoom(validatePair(pair)); }
  async syncRooms(principal: UserPrincipal) {
    const pairs = await this.matches.activePairs(principal);
    for (const input of pairs) {
      const pair = validatePair(input);
      if (![pair.leftUserId, pair.rightUserId].includes(principal.userId)) throw new ForbiddenException();
      await this.repository.ensureRoom(pair);
    }
    return this.repository.rooms(principal.userId);
  }
  rooms(userId: string) { return this.repository.rooms(userId); }
  room(roomId: number, userId: string) { return this.repository.room(roomId, userId); }
}
