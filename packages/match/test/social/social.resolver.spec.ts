import { jest } from "@jest/globals";
import { SocialResolver } from "../../src/social/social.resolver.js";
import { LikeEntity } from "../../src/like/domain/model/like.js";
import { PairEntity } from "../../src/pair/domain/model/pair.js";
import type { UserPrincipal } from "@core/auth";
const user = {
  userId: "me",
  scopes: ["match:read", "match:write"],
} as UserPrincipal;
const time = new Date("2026-10-06T00:00:00Z");
const like = (id: number, likerId: string, likeeId: string, active = true) =>
  LikeEntity.of({ likerId, likeeId, source: 1, active }).setPersistence(
    id,
    time,
    time,
  );
const pair = (
  id: number,
  leftUserId: string,
  rightUserId: string,
  active = true,
) =>
  PairEntity.of({ leftUserId, rightUserId, active }).setPersistence(
    id,
    time,
    time,
  );
function fixture() {
  const likes: any = {
    selectLikeInFromUserId: jest.fn(),
    selectLikeOutFromUserId: jest
      .fn<() => Promise<any[]>>()
      .mockResolvedValue([]),
    selectLikeFromId: jest.fn(),
  };
  const pairs: any = { selectPairsFromUser: jest.fn() };
  const commands: any = { execute: jest.fn() };
  return {
    likes,
    pairs,
    commands,
    resolver: new SocialResolver(likes as any, pairs as any, commands as any),
  };
}
describe("Gateway 관심·매칭 정책", () => {
  test("받은 관심은 본인이 받은 활성 관심만 최신순으로 페이지한다", async () => {
    const f = fixture();
    f.likes.selectLikeInFromUserId.mockResolvedValue([
      like(1, "a", "me"),
      like(5, "b", "me"),
      like(7, "c", "me", false),
      like(8, "a", "stranger"),
    ]);
    expect(await f.resolver.myReceivedLikes(user, 1, 0)).toEqual([
      { id: 5, otherUserId: "b", likedAt: time.toISOString() },
    ]);
    expect(await f.resolver.myReceivedLikes(user, 1, 1)).toEqual([
      { id: 1, otherUserId: "a", likedAt: time.toISOString() },
    ]);
  });
  test("보낸 관심은 수신자를 표시하고 비활성 관심을 제외한다", async () => {
    const f = fixture();
    f.likes.selectLikeOutFromUserId.mockResolvedValue([
      like(1, "me", "friend"),
      like(2, "me", "old", false),
    ]);
    expect(await f.resolver.mySentLikes(user, 50, 0)).toEqual([
      { id: 1, otherUserId: "friend", likedAt: time.toISOString() },
    ]);
  });
  test("매칭 양쪽 참여자 모두 자신이 아닌 상대를 조회한다", async () => {
    const f = fixture();
    f.pairs.selectPairsFromUser.mockResolvedValue([
      pair(1, "me", "left-friend"),
      pair(2, "right-friend", "me"),
      pair(3, "a", "b"),
      pair(4, "me", "old", false),
    ]);
    expect(
      (await f.resolver.myPairs(user, 50, 0)).map((p) => p.otherUserId),
    ).toEqual(["right-friend", "left-friend"]);
  });
  test("큰 페이지나 음수 offset은 거절한다", async () => {
    const f = fixture();
    f.likes.selectLikeInFromUserId.mockResolvedValue([]);
    await expect(f.resolver.myReceivedLikes(user, 51, 0)).rejects.toThrow(
      "조회 범위",
    );
    await expect(f.resolver.myReceivedLikes(user, 20, -1)).rejects.toThrow(
      "조회 범위",
    );
  });
  test("다른 사람이 받은 관심은 거절할 수 없다", async () => {
    const f = fixture();
    f.likes.selectLikeFromId.mockResolvedValue(like(1, "a", "other"));
    await expect(f.resolver.declineLike(user, 1)).rejects.toThrow(
      "내가 받은 관심",
    );
    expect(f.commands.execute).not.toHaveBeenCalled();
  });
  test("이미 거절한 본인 관심은 중복 변경하지 않는다", async () => {
    const f = fixture();
    f.likes.selectLikeFromId.mockResolvedValue(like(1, "a", "me", false));
    expect(await f.resolver.declineLike(user, 1)).toBe(true);
    expect(f.commands.execute).not.toHaveBeenCalled();
  });
  test("공백 신고나 잘못된 ID를 서버에서 거절한다", async () => {
    const f = fixture();
    await expect(f.resolver.reportPair(user, 1, " ")).rejects.toThrow(
      "신고 사유",
    );
    await expect(f.resolver.acceptLike(user, -1)).rejects.toThrow("잘못된 ID");
  });
  test.each(["myReceivedLikes", "mySentLikes", "myPairs"])(
    "%s는 match:read를 요구한다",
    (name) =>
      expect(
        Reflect.getMetadata("scopes", SocialResolver.prototype[name]),
      ).toEqual(["match:read"]),
  );
  test.each(["acceptLike", "declineLike", "cancelPair", "reportPair"])(
    "%s는 match:write를 요구한다",
    (name) =>
      expect(
        Reflect.getMetadata("scopes", SocialResolver.prototype[name]),
      ).toEqual(["match:write"]),
  );
});
