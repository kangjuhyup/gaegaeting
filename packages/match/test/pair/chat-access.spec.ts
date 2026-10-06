import { GetChatPairsHandler } from '#app/pair/applicatoin/service/query/get-chat-pairs.query';
import { GetChatPairsQuery } from '#app/pair/applicatoin/port/query/get-chat-pairs.port';
import { CancelPairHandler } from '#app/pair/applicatoin/service/command/cancel-pair.command';
import { CancelPairCommand } from '#app/pair/applicatoin/port/command/cancel-pair.port';
import { PairEntity } from '#app/pair/domain/model/pair';
import { bindTransactionBoundaryForTest } from '@core/database/testing';

const pair = (leftUserId: string, rightUserId: string, active = true, id = 1) => PairEntity.of({ leftUserId, rightUserId, active }).setPersistence(id, new Date(), new Date());
describe('채팅은 본인의 활성 매칭만 동기화한다', () => {
  it('왼쪽과 오른쪽 참여자를 모두 허용하고 다른 매칭과 취소된 매칭은 제외한다', async () => {
    const handler = new GetChatPairsHandler({ selectPairsFromUser: async () => [pair('a', 'b'), pair('c', 'a', true, 2), pair('a', 'd', false, 3), pair('e', 'f', true, 4)] } as any);
    const result = await handler.execute(new GetChatPairsQuery({ userId: 'a' } as any));
    expect(result.pairs.map(pair => pair.pairId)).toEqual([1, 2]);
  });
  it.each(['a', 'b'])('양쪽 참여자 %s는 매칭을 취소할 수 있다', async userId => {
    const target = pair('a', 'b');
    const handler = new CancelPairHandler({ selectPairFromId: async () => target, updatePair: async () => {} } as any);
    bindTransactionBoundaryForTest(handler, { owner: 'test', run: work => work() });
    await handler.execute(new CancelPairCommand({ userId } as any, 1));
    expect(target.active).toBe(false);
  });
  it('다른 사용자는 매칭을 취소할 수 없다', async () => {
    const target = pair('a', 'b');
    const handler = new CancelPairHandler({ selectPairFromId: async () => target } as any);
    bindTransactionBoundaryForTest(handler, { owner: 'test', run: work => work() });
    await expect(handler.execute(new CancelPairCommand({ userId: 'c' } as any, 1))).rejects.toThrow('내 매칭');
    expect(target.active).toBe(true);
  });
  it('없는 매칭을 취소하면 찾을 수 없음으로 응답한다', async () => {
    const handler = new CancelPairHandler({ selectPairFromId: async () => null } as any);
    bindTransactionBoundaryForTest(handler, { owner: 'test', run: work => work() });
    await expect(handler.execute(new CancelPairCommand({ userId: 'a' } as any, 1))).rejects.toThrow('매칭을 찾을 수 없습니다');
  });
});
