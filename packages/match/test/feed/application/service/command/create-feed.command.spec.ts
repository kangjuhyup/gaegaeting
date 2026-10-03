import { jest } from "@jest/globals";
import type { UserPrincipal } from "@core/auth";
import { bindTransactionBoundaryForTest } from "@core/database/testing";
import { CreateFeedCommand } from "#app/feed/application/port/command/create-feed.port";
import { CreateFeedCommandHandler } from "#app/feed/application/service/command/create-feed.command";
import { FeedRepositoryPort } from "#app/feed/domain/port/feed.repository.port";
import { FeedItemRepositoryPort } from "#app/feed/domain/port/feed-item.repository.port";
import { LocationRepositoryPort } from "#app/location/domain/port/location.repostiory.port";
import { LocationEntity } from "#app/location/domain/model/location";

const user = { userId: "viewer" } as UserPrincipal;

describe("수동 일일 추천 생성", () => {
  let feeds: jest.Mocked<FeedRepositoryPort>;
  let items: jest.Mocked<FeedItemRepositoryPort>;
  let locations: jest.Mocked<LocationRepositoryPort>;

  beforeEach(() => {
    feeds = { saveFeed: jest.fn(), getMyFeedWithItems: jest.fn() };
    items = {
      saveFeedItem: jest.fn(),
      getFeedItemFromId: jest.fn(),
      updateFeedItem: jest.fn(),
    };
    locations = {
      saveLocation: jest.fn(),
      selectLocationFromUserId: jest.fn(),
      findNearbyTargets: jest.fn(),
    };
    feeds.saveFeed.mockImplementation(async (feed) =>
      feed.setPersistence(1, new Date(), new Date()),
    );
    items.saveFeedItem.mockImplementation(async (item) => item);
    locations.selectLocationFromUserId.mockResolvedValue(
      LocationEntity.of({ latitude: 37.5, longitude: 127 }, user.userId),
    );
    locations.findNearbyTargets.mockResolvedValue(["target"]);
  });

  function handlerAt(now: Date) {
    const handler = new CreateFeedCommandHandler(feeds, items, locations, {
      now: () => now,
    });
    bindTransactionBoundaryForTest(handler, {
      owner: "test",
      run: (work) => work(),
    });
    return handler;
  }

  it.each([
    [0, 0, 1],
    [7, 59, 1],
    [8, 0, 1],
    [11, 59, 1],
    [12, 0, 2],
    [15, 59, 2],
    [16, 0, 2],
    [17, 59, 2],
    [18, 0, 3],
    [23, 59, 3],
  ])(
    "%i시 %i분에는 슬롯 %i에 저장하고 다음 날 0시에 만료한다",
    async (hour, minute, slot) => {
      const now = new Date(Date.UTC(2026, 9, 3, hour - 9, minute));

      const result = await handlerAt(now).execute(new CreateFeedCommand(user));

      expect(result.slot).toBe(slot);
      expect(result.date.toString()).toBe("20261003");
      expect(result.expiresAt).toEqual(new Date("2026-10-04T00:00:00+09:00"));
      expect(result.items?.map((item) => item.targetUserId)).toEqual([
        "target",
      ]);
    },
  );

  it("연말 저녁 추천도 다음 해 첫날 0시에 만료한다", async () => {
    const result = await handlerAt(
      new Date("2026-12-31T18:00:00+09:00"),
    ).execute(new CreateFeedCommand(user));
    expect(result.expiresAt).toEqual(new Date("2027-01-01T00:00:00+09:00"));
  });

  it("UTC 날짜가 전날이어도 한국 날짜로 추천을 저장한다", async () => {
    const result = await handlerAt(new Date("2026-10-02T23:30:00Z")).execute(
      new CreateFeedCommand(user),
    );
    expect(result.date.toString()).toBe("20261003");
    expect(result.slot).toBe(1);
    expect(result.expiresAt).toEqual(new Date("2026-10-03T15:00:00Z"));
  });

  it("위치가 없는 사용자는 후보 없이 빈 추천을 생성한다", async () => {
    locations.selectLocationFromUserId.mockResolvedValue(null);
    const result = await handlerAt(
      new Date("2026-10-03T12:00:00+09:00"),
    ).execute(new CreateFeedCommand(user));
    expect(result.items).toBeUndefined();
    expect(locations.findNearbyTargets).not.toHaveBeenCalled();
  });
});
