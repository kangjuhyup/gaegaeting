import { FeedItemEntity } from "#app/feed/domain/model/feed-item";
import { FeedItem } from "#app/feed/infrastructure/adapter/inbound/gql/dto/feed-item.type";

describe("persisted feed reactions", () => {
  function stored(state: number) {
    return FeedItemEntity.of({
      targetUserId: "target",
      feedId: 1,
      state,
    }).setPersistence(7, new Date(), new Date());
  }

  it.each([
    [1, "DELIVERY"],
    [2, "VIEW"],
    [3, "LIKE"],
    [4, "PASS"],
  ])("reads existing database state %i as %s", (state, label) => {
    expect(FeedItem.fromDomain(stored(state as number)).state).toBe(label);
  });

  it("keeps a sent interest after persistence and reload", () => {
    const item = stored(1);
    item.setLike();
    expect(item.state).toBe(3);
    expect(FeedItem.fromDomain(stored(item.state)).state).toBe("LIKE");
  });

  it("reads a skipped recommendation after persistence without a GraphQL error", () => {
    const item = stored(1);
    item.setPass();
    expect(item.state).toBe(4);
    expect(FeedItem.fromDomain(stored(item.state)).state).toBe("PASS");
  });
});
