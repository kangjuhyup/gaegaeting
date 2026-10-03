import type { UserPrincipal } from '@core/auth';
import type { ChatPair } from '../../domain/model/room.js';
export abstract class MatchPairsPort {
  abstract activePairs(principal: UserPrincipal): Promise<ChatPair[]>;
}
