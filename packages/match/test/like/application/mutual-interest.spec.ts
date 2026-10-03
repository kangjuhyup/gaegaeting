import { SaveLikeHandler } from '#app/like/application/service/command/save-like.command';
import { SaveLikeCommand } from '#app/like/application/port/command/save-like.port';
import { LikeEntity } from '#app/like/domain/model/like';
import { Topics } from '#app/common/topic';
import { ChatRoomCreatedV1Payload } from '#app/common/payload';
import { bindTransactionBoundaryForTest } from '@core/database/testing';

describe('서로 관심을 보낸 산책 친구만 매칭한다', () => {
  const a = '01ARZ3NDEKTSV4RRFFQ69G5FAV'; const b = '01ARZ3NDEKTSV4RRFFQ69G5FAW';
  const fixture = (reciprocal: LikeEntity[]) => {
    const events: Array<{ topic: string; payload: any }> = [];
    const handler = new SaveLikeHandler({
      saveLike: async like => like.setPersistence(10, new Date(), new Date()),
      selectLikeOutFromUserId: async id => id === b ? reciprocal : [],
    } as any, { produce: async (topic, payload) => { events.push({ topic, payload }); } } as any,
    { publish: async (topic, payload) => { events.push({ topic, payload }); } } as any);
    bindTransactionBoundaryForTest(handler, { owner: 'test', run: work => work() });
    return { handler, events };
  };
  it('한쪽만 관심을 보냈을 때 채팅방을 만들지 않는다', async () => {
    const { handler, events } = fixture([]);
    await handler.execute(new SaveLikeCommand(a, b, 0));
    expect(events.map(event => event.topic)).toEqual([Topics.NOTIFICATION_FCM_SEND_V1]);
  });
  it('상대방도 활성 관심을 보낸 경우 두 관심 ID와 함께 매칭을 만든다', async () => {
    const reciprocal = LikeEntity.of({ likerId: b, likeeId: a, source: 0, active: true }).setPersistence(11, new Date(), new Date());
    const { handler, events } = fixture([reciprocal]);
    await handler.execute(new SaveLikeCommand(a, b, 0));
    expect(events[0].topic).toBe(Topics.MATCH_PAIR_CREATED_V1);
    expect(events[0].payload.leftUserId).toBe(a); expect(events[0].payload.rightUserId).toBe(b);
    expect(events[0].payload.likeAId).toBe(10); expect(events[0].payload.likeBId).toBe(11);
  });
  it('취소한 관심으로는 새 매칭을 만들지 않는다', async () => {
    const { handler, events } = fixture([LikeEntity.of({ likerId: b, likeeId: a, source: 0, active: false })]);
    await handler.execute(new SaveLikeCommand(a, b, 0));
    expect(events.map(event => event.topic)).toEqual([Topics.NOTIFICATION_FCM_SEND_V1]);
  });
  it('채팅방 생성 이벤트는 소비자가 읽는 공개 JSON 계약으로 직렬화한다', () => {
    expect(JSON.parse(JSON.stringify(new ChatRoomCreatedV1Payload(a, b, 12)))).toEqual({ leftUserId: a, rightUserId: b, pairId: 12 });
  });
});
