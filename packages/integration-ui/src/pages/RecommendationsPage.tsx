import { useEffect, useState } from "react";
import { Alert, Button, PageTitle, Spinner } from "@gaegaeting/ui-common";
import { errorMessage, graphql } from "@gaegaeting/ui-common";
import type { AppConfig, Feed, FeedItem } from "../types.js";
import { RecommendationCard } from "../components/RecommendationCard.js";
import {
  loadRecommendationDetails,
  type RecommendationDetails,
} from "../lib/recommendation-details.js";

export function RecommendationsPage({
  config,
  token,
}: {
  config: AppConfig;
  token?: string;
}) {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [acted, setActed] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [details, setDetails] = useState<Record<string, RecommendationDetails>>(
    {},
  );
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsFailed, setDetailsFailed] = useState(false);
  function currentPosition(): Promise<GeolocationPosition> {
    if (!navigator.geolocation) {
      return Promise.reject(
        new Error("이 브라우저에서는 위치를 사용할 수 없어요."),
      );
    }
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 60_000,
      });
    });
  }
  async function load(create = false) {
    if (!token) {
      setError("로그인 후 이용해 주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (create) {
        let position: GeolocationPosition;
        try {
          position = await currentPosition();
        } catch {
          throw new Error(
            "추천을 만들려면 위치 권한이 필요해요. 브라우저에서 위치 사용을 허용해 주세요.",
          );
        }
        await graphql<{ setCurrentLocation: boolean }>(
          config.gatewayUrl,
          `
            mutation SetCurrentLocation($input: SetLocationInput!) {
              setCurrentLocation(input: $input)
            }
          `,
          {
            input: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
          },
          token,
        );
        await graphql<{ createDailyFeed: boolean }>(
          config.gatewayUrl,
          `
            mutation {
              createDailyFeed
            }
          `,
          {},
          token,
        );
      }
      const data = await graphql<{ getDailyFeed: Feed[] }>(
        config.gatewayUrl,
        `
          query GetDailyFeed {
            getDailyFeed {
              id
              date
              slot
              items {
                id
                targetUserId
                state
                showAt
                actionAt
              }
            }
          }
        `,
        {},
        token,
      );
      setFeeds(data.getDailyFeed);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    setFeeds([]);
    setActed({});
    setPending({});
    void load(false);
  }, [config.gatewayUrl, token]);
  useEffect(() => {
    let cancelled = false;
    setDetails({});
    setDetailsFailed(false);
    const ids = feeds.flatMap((feed) =>
      feed.items.map((item) => item.targetUserId),
    );
    if (!token || !ids.length) {
      setDetailsLoading(false);
      return;
    }
    setDetailsLoading(true);
    loadRecommendationDetails(config.gatewayUrl, ids, token)
      .then((data) => {
        if (!cancelled) setDetails(data);
      })
      .catch(() => {
        if (!cancelled) setDetailsFailed(true);
      })
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [config.gatewayUrl, token, feeds]);
  async function action(item: FeedItem, state: "LIKE" | "PASS") {
    if (
      !token ||
      pending[item.id] ||
      acted[item.id] ||
      ["LIKE", "PASS"].includes(item.state)
    )
      return;
    setError("");
    setPending((current) => ({ ...current, [item.id]: true }));
    try {
      const result = await graphql<{ actionFeed: boolean }>(
        config.gatewayUrl,
        `
          mutation ActionFeed($input: ActionFeedInput!) {
            actionFeed(input: $input)
          }
        `,
        { input: { id: Number(item.id), state } },
        token,
      );
      if (!result.actionFeed)
        throw new Error("관심 상태를 저장하지 못했어요. 다시 시도해 주세요.");
      setActed((current) => ({ ...current, [item.id]: state }));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending((current) => ({ ...current, [item.id]: false }));
    }
  }
  const items = feeds.flatMap((feed) => feed.items);
  return (
    <section className="page recommendation-page">
      <div className="recommend-heading">
        <PageTitle
          eyebrow="추천"
          title={
            <>
              오늘의 <em>산책 메이트</em>
            </>
          }
          description="나와 잘 맞는 산책 친구를 만나보세요."
        />
        <Button onClick={() => load(true)} disabled={loading}>
          {loading && <Spinner />}내 위치로 추천 만들기
        </Button>
      </div>
      {error && <Alert type="error">{error}</Alert>}
      {!loading && items.length === 0 && !error && (
        <div className="empty-state">
          <span>🐾</span>
          <h2>아직 오늘의 추천이 없어요</h2>
          <p>위치를 허용하면 근처의 산책 친구를 찾아드려요.</p>
          <Button onClick={() => load(true)}>내 위치로 첫 추천 만들기</Button>
        </div>
      )}
      <div className="recommend-grid">
        {items.map((item, index) => (
          <RecommendationCard
            key={item.id}
            item={item}
            index={index}
            slot={feeds.find((feed) => feed.items.includes(item))?.slot}
            details={details[item.targetUserId]}
            detailsLoading={detailsLoading}
            detailsFailed={detailsFailed}
            acted={acted[item.id]}
            pending={pending[item.id]}
            onAction={(state) => {
              void action(item, state);
            }}
          />
        ))}
      </div>
    </section>
  );
}
