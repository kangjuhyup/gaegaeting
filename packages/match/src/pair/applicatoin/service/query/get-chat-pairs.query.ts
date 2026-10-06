import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { PairRepositoryPort } from '../../../domain/port/pair.repository.port.js';
import { GetChatPairsQuery } from '../../port/query/get-chat-pairs.port.js';

@QueryHandler(GetChatPairsQuery)
export class GetChatPairsHandler implements IQueryHandler<GetChatPairsQuery> {
  constructor(private readonly pairs: PairRepositoryPort) {}
  async execute(query: GetChatPairsQuery) {
    const pairs = await this.pairs.selectPairsFromUser(query.user.userId);
    return { pairs: pairs.filter(pair => pair.active &&
      [pair.leftUserId, pair.rightUserId].includes(query.user.userId)).map(pair => ({
      pairId: pair.id, leftUserId: pair.leftUserId, rightUserId: pair.rightUserId,
    })) };
  }
}
