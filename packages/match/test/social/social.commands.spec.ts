import { jest } from "@jest/globals";
import { bindTransactionBoundaryForTest } from "@core/database/testing";
import type { UserPrincipal } from "@core/auth";
import { LikeEntity } from "../../src/like/domain/model/like.js";
import { PairEntity } from "../../src/pair/domain/model/pair.js";
import { AcceptLikeHandler } from "../../src/like/application/service/command/accept-like.command.js";
import { AcceptLikeCommand } from "../../src/like/application/port/command/accept-like.command.js";
import { CancelPairHandler } from "../../src/pair/applicatoin/service/command/cancel-pair.command.js";
import { CancelPairCommand } from "../../src/pair/applicatoin/port/command/cancel-pair.port.js";
import { ReportPairHandler } from "../../src/pair/applicatoin/service/command/report-pair.port.js";
import { ReportPairCommand } from "../../src/pair/applicatoin/port/command/report-pair.port.js";
const user = { userId: "me" } as UserPrincipal;
const time = new Date("2026-10-06T00:00:00Z");
const incoming = (likeeId = "me", active = true) =>
  LikeEntity.of({
    likerId: "friend",
    likeeId,
    active,
    source: 1,
  }).setPersistence(1, time, time);
const ownedPair = (left = "me", right = "friend") =>
  PairEntity.of({
    leftUserId: left,
    rightUserId: right,
    active: true,
  }).setPersistence(1, time, time);
function transactional<T extends object>(handler: T): T {
  bindTransactionBoundaryForTest(handler, {
    owner: "test",
    run: (work) => work(),
  });
  return handler;
}
describe("관심 수락의 소유권과 중복 정책", () => {
  function fixture() {
    const repository: any = {
      lockLikeFromId: jest
        .fn<() => Promise<any>>()
        .mockResolvedValue(incoming()),
      selectLikeOutFromUserId: jest
        .fn<() => Promise<any[]>>()
        .mockResolvedValue([]),
      saveLike: jest.fn<() => Promise<any>>().mockResolvedValue(incoming()),
    };
    const events: any = { publish: jest.fn() };
    return {
      repository,
      events,
      handler: transactional(new AcceptLikeHandler(repository, events)),
    };
  }
  test("수신자 본인만 활성 관심을 수락할 수 있다", async () => {
    const f = fixture();
    f.repository.lockLikeFromId.mockResolvedValue(incoming("stranger"));
    await expect(
      f.handler.execute(new AcceptLikeCommand(user, 1)),
    ).rejects.toThrow("내가 받은 활성");
    expect(f.repository.saveLike).not.toHaveBeenCalled();
    expect(f.events.publish).not.toHaveBeenCalled();
  });
  test("비활성·누락 관심을 거절한다", async () => {
    const f = fixture();
    f.repository.lockLikeFromId.mockResolvedValue(incoming("me", false));
    await expect(
      f.handler.execute(new AcceptLikeCommand(user, 1)),
    ).rejects.toThrow();
    f.repository.lockLikeFromId.mockResolvedValue(null);
    await expect(
      f.handler.execute(new AcceptLikeCommand(user, 1)),
    ).rejects.toThrow("찾을 수");
  });
  test("받은 관심 행 잠금을 먼저 확보한 뒤 역방향 관심과 매칭 이벤트를 생성한다", async () => {
    const f = fixture();
    await f.handler.execute(new AcceptLikeCommand(user, 1));
    expect(f.repository.lockLikeFromId).toHaveBeenCalledWith(1);
    expect(f.repository.saveLike).toHaveBeenCalledTimes(1);
    expect(f.events.publish).toHaveBeenCalledTimes(1);
  });
  test("이미 수락한 관심의 재시도는 새 관심·매칭 이벤트를 만들지 않는다", async () => {
    const f = fixture();
    f.repository.selectLikeOutFromUserId.mockResolvedValue([
      LikeEntity.of({
        likerId: "me",
        likeeId: "friend",
        active: true,
        source: 1,
      }),
    ]);
    await f.handler.execute(new AcceptLikeCommand(user, 1));
    expect(f.repository.saveLike).not.toHaveBeenCalled();
    expect(f.events.publish).not.toHaveBeenCalled();
  });
});
describe("매칭 양쪽 참여자 권한", () => {
  test.each([
    ["me", "friend"],
    ["friend", "me"],
  ])("양쪽 모두 자신의 매칭을 취소할 수 있다: %s %s", async (left, right) => {
    const pair = ownedPair(left, right);
    const repository: any = {
      selectPairFromId: jest.fn<() => Promise<any>>().mockResolvedValue(pair),
      updatePair: jest.fn(),
    };
    await transactional(new CancelPairHandler(repository)).execute(
      new CancelPairCommand(user, 1),
    );
    expect(pair.active).toBe(false);
    expect(repository.updatePair).toHaveBeenCalledWith(pair);
  });
  test("제삼자의 취소 요청은 거절한다", async () => {
    const repository: any = {
      selectPairFromId: jest
        .fn<() => Promise<any>>()
        .mockResolvedValue(ownedPair("a", "b")),
      updatePair: jest.fn(),
    };
    await expect(
      transactional(new CancelPairHandler(repository)).execute(
        new CancelPairCommand(user, 1),
      ),
    ).rejects.toThrow("내 매칭");
    expect(repository.updatePair).not.toHaveBeenCalled();
  });
  test("신고 사유는 이벤트에 전달하고 본인 매칭만 취소한다", async () => {
    const pair = ownedPair("friend", "me");
    const repository: any = {
      selectPairFromId: jest.fn<() => Promise<any>>().mockResolvedValue(pair),
      updatePair: jest.fn(),
    };
    const kafka: any = { produce: jest.fn() };
    await new ReportPairHandler(repository, kafka).execute(
      new ReportPairCommand(user, 1, "불쾌한 메시지"),
    );
    expect(kafka.produce).toHaveBeenCalledWith("match.pair.reported.v1", {
      pairId: 1,
      reporterId: "me",
      reason: "불쾌한 메시지",
    });
    expect(pair.active).toBe(false);
  });
});
