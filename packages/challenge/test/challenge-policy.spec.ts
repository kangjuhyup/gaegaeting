import { challengeEndsAt } from "../src/participation/domain/challenge-enrollment.js";
import { DAY_MS } from "../src/shared/domain/calendar.js";
import { progressFor } from "../src/participation/domain/challenge-progress.js";
import { validateActivity } from "../src/activity/domain/activity.js";
import { diary, input, NOW, participation, walk } from "./fixtures.js";

describe("챌린지 참여 기간", () => {
  it.each([
    ["2026-10-04T23:00:00Z", 7, "2026-10-11T15:00:00.000Z"],
    ["2026-12-31T23:59:59+09:00", 14, "2027-01-13T15:00:00.000Z"],
    ["2028-02-27T12:00:00+09:00", 7, "2028-03-04T15:00:00.000Z"],
  ])("참여 날짜를 한국 시간의 첫째 날로 계산한다: %s", (joined, days, end) => {
    expect(challengeEndsAt(new Date(joined), days).toISOString()).toBe(end);
  });

  it("참여 전에 시작한 산책은 소급하지 않는다", () => {
    const activity = walk();
    activity.facts!.walkStartedAt = "2026-10-05T08:59:59+09:00";
    expect(progressFor(participation(), [activity], NOW).progressCount).toBe(0);
  });

  it("마지막 날 다음 자정에 종료한 산책은 기간 밖이다", () => {
    const item = participation();
    const activity = walk();
    activity.facts!.walkEndedAt = item.endsAt.toISOString();
    expect(progressFor(item, [activity], item.endsAt).progressCount).toBe(0);
  });

  it("기간 종료 후 24시간은 기록 확인 중이고 이후에는 미달성으로 종료한다", () => {
    const item = participation();
    expect(progressFor(item, [], item.endsAt).status).toBe("VERIFYING");
    expect(progressFor(item, [], item.settlesAt).status).toBe("EXPIRED");
  });

  it("종료 후 24시간 안에 받은 실적만 인정한다", () => {
    const activity = walk();
    activity.qualifyingReceivedAt = new Date(
      new Date(activity.facts!.walkEndedAt).getTime() + DAY_MS,
    );
    expect(
      progressFor(participation(), [activity], activity.qualifyingReceivedAt)
        .progressCount,
    ).toBe(1);
    activity.qualifyingReceivedAt = new Date(
      activity.qualifyingReceivedAt.getTime() + 1,
    );
    expect(
      progressFor(participation(), [activity], activity.qualifyingReceivedAt)
        .progressCount,
    ).toBe(0);
  });
});

describe("우리 동네 탐험대", () => {
  it("다른 보호자의 서로 다른 코스 세 개를 걸으면 보상을 얻는다", () => {
    const activities = [
      walk("one", "a"),
      walk("two", "b"),
      walk("three", "c"),
      walk("four", "d"),
    ];
    const result = progressFor(participation(), activities, NOW);
    expect(result).toMatchObject({
      status: "COMPLETED",
      progressCount: 3,
      earnedRewardCode: "TEST_REWARD",
    });
  });

  it("같은 코스의 반복 완주는 한 번만 인정한다", () => {
    expect(
      progressFor(participation(), [walk("one"), walk("two")], NOW)
        .progressCount,
    ).toBe(1);
  });

  it.each(["own", "incomplete", "stationary", "no-route", "other-user"])(
    "%s 산책은 실적으로 인정하지 않는다",
    (scenario) => {
      const activity = walk();
      if (scenario === "own") activity.facts!.routeAuthorId = "viewer";
      if (scenario === "incomplete") activity.facts!.completed = false;
      if (scenario === "stationary") activity.facts!.distanceMeters = 0;
      if (scenario === "no-route") {
        activity.facts!.routeId = null;
        activity.facts!.routeAuthorId = null;
      }
      if (scenario === "other-user") activity.userId = "someone-else";
      expect(progressFor(participation(), [activity], NOW).progressCount).toBe(
        0,
      );
    },
  );

  it("획득 근거를 삭제하면 진행률과 보상도 재계산한다", () => {
    const activities = [walk("one", "a"), walk("two", "b"), walk("three", "c")];
    expect(progressFor(participation(), activities, NOW).status).toBe(
      "COMPLETED",
    );
    activities[2] = {
      ...activities[2],
      deleted: true,
      facts: null,
      qualifyingReceivedAt: null,
    };
    expect(progressFor(participation(), activities, NOW)).toMatchObject({
      status: "ACTIVE",
      progressCount: 2,
      earnedRewardCode: null,
    });
    expect(
      progressFor(participation(), activities, participation().settlesAt)
        .status,
    ).toBe("EXPIRED");
  });

  it("취소한 참여에는 취소 뒤 산책을 추가하지 않는다", () => {
    const item = {
      ...participation(),
      cancelledAt: new Date("2026-10-05T10:00:00+09:00"),
      isCurrent: false,
    };
    expect(progressFor(item, [walk()], NOW)).toMatchObject({
      status: "CANCELLED",
      progressCount: 0,
      earnedRewardCode: null,
    });
  });
});

describe("우리 강아지 산책일기", () => {
  it("같은 날짜의 일기 여러 개는 한 번만 인정한다", () => {
    expect(
      progressFor(
        participation("WALK_DIARY"),
        [diary("one"), diary("two")],
        NOW,
      ).progressCount,
    ).toBe(1);
  });

  it("서로 다른 한국 날짜 세 개를 채우면 완성한다", () => {
    expect(
      progressFor(
        participation("WALK_DIARY"),
        [
          diary("one"),
          diary("two", "2026-10-06"),
          diary("three", "2026-10-07"),
        ],
        new Date("2026-10-07T12:00:00+09:00"),
      ).status,
    ).toBe("COMPLETED");
  });

  it.each(["no-photo", "no-mood", "stationary", "next-day"])(
    "%s 일기는 인정하지 않는다",
    (scenario) => {
      const activity = diary();
      if (scenario === "no-photo") activity.facts!.hasPhoto = false;
      if (scenario === "no-mood") activity.facts!.mood = "  ";
      if (scenario === "stationary") activity.facts!.distanceMeters = 0;
      if (scenario === "next-day")
        activity.facts!.diarySavedAt = "2026-10-06T00:00:00+09:00";
      expect(
        progressFor(participation("WALK_DIARY"), [activity], NOW).progressCount,
      ).toBe(0);
    },
  );

  it("원본 산책이 삭제되면 먼저 전송된 일기도 실적에서 제외한다", () => {
    const activity = diary();
    const deletedWalk = {
      ...walk(activity.walkId!),
      deleted: true,
      facts: null,
      qualifyingReceivedAt: null,
    };
    expect(
      progressFor(participation("WALK_DIARY"), [activity, deletedWalk], NOW)
        .progressCount,
    ).toBe(0);
  });

  it("다른 계정의 산책 삭제는 내 실적을 바꾸지 않는다", () => {
    const activity = diary();
    const other = {
      ...walk(activity.walkId!),
      userId: "other",
      deleted: true,
      facts: null,
      qualifyingReceivedAt: null,
    };
    expect(
      progressFor(participation("WALK_DIARY"), [activity, other], NOW)
        .progressCount,
    ).toBe(1);
  });
});

describe("검증된 실적의 입력 계약", () => {
  it.each([
    "future",
    "negative-distance",
    "invalid-date",
    "zero-revision",
    "wrong-walk",
    "missing-photo-state",
  ])("%s 입력을 거절한다", (scenario) => {
    const update = input(scenario === "missing-photo-state" ? diary() : walk());
    if (scenario === "future")
      update.facts!.walkEndedAt = "2027-01-01T00:00:00Z";
    if (scenario === "negative-distance") update.facts!.distanceMeters = -1;
    if (scenario === "invalid-date") update.facts!.walkStartedAt = "not-a-date";
    if (scenario === "zero-revision") update.revision = 0;
    if (scenario === "wrong-walk") update.facts!.walkId = "another";
    if (scenario === "missing-photo-state") delete update.facts!.hasPhoto;
    expect(() => validateActivity(update, NOW)).toThrow();
  });

  it("삭제 이벤트에는 원본 내용을 넣지 않는다", () => {
    const update = { ...input(walk()), deleted: true };
    expect(() => validateActivity(update, NOW)).toThrow();
    expect(() =>
      validateActivity({ ...update, facts: null }, NOW),
    ).not.toThrow();
  });
});
