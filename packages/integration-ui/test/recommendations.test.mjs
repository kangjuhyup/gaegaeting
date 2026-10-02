import assert from "node:assert/strict";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const originalWindow = globalThis.window;
globalThis.window = {};
const server = await createServer({
  configFile: false,
  plugins: [react()],
  cacheDir: "node_modules/.vite/qa-ssr",
  root: fileURLToPath(new URL("../", import.meta.url)),
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true, entries: [] },
  appType: "custom",
});
after(async () => {
  await server.close();
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
});
const { RecommendationCard } = await server.ssrLoadModule(
  "/src/components/RecommendationCard.tsx",
);
const { loadRecommendationDetails } = await server.ssrLoadModule(
  "/src/lib/recommendation-details.ts",
);

const pet = {
  id: 1,
  name: "몽이",
  age: 3,
  gender: "MALE",
  breed: "POODLE",
  size: "SMALL",
  personalities: ["FRIENDLY"],
  description: "공놀이를 좋아해요",
  isCertificated: false,
  profileImages: ["https://storage.example.test/approved.jpg"],
};
const props = {
  item: { id: "7", targetUserId: "owner", state: "DELIVERY" },
  index: 0,
  detailsLoading: false,
  detailsFailed: false,
  onAction() {},
};
function card(overrides = {}) {
  return renderToStaticMarkup(
    createElement(RecommendationCard, { ...props, ...overrides }),
  );
}

test("shows every pet with Korean details and the approved photo returned by the API", () => {
  const html = card({
    details: {
      nickname: "산책친구",
      pets: [pet, { ...pet, id: 2, name: "초코", profileImages: [] }],
    },
  });
  for (const label of [
    "산책친구님의 산책 친구",
    "몽이",
    "초코",
    "푸들",
    "3살",
    "남아",
    "소형",
    "사교적",
    "공놀이를 좋아해요",
    "반려견 2마리",
    "강아지 기본 이미지",
  ])
    assert.ok(html.includes(label), label);
  assert.ok(html.includes(pet.profileImages[0]));
  assert.ok(!html.includes("% MATCH"));
});

test("a saved LIKE shows the interest badge on a fresh render and prevents another action", () => {
  const html = card({
    item: { ...props.item, state: "LIKE" },
    details: { pets: [pet] },
  });
  assert.ok(html.includes("관심 보냄 ♥"));
  assert.ok(html.includes("match-card--interested"));
  assert.ok(!html.includes("<button"));
});

test("a just-saved interest is visible immediately and PASS is not marked interested", () => {
  assert.ok(card({ acted: "LIKE" }).includes("관심 보냄 ♥"));
  const html = card({ item: { ...props.item, state: "PASS" } });
  assert.ok(!html.includes("관심 보냄 ♥"));
  assert.ok(!html.includes("<button"));
});

test("missing pets or a detail-query failure retains the recommendation actions", () => {
  for (const overrides of [
    { details: { pets: [] } },
    { detailsFailed: true },
  ]) {
    const html = card(overrides);
    assert.ok(html.includes("강아지 기본 이미지"));
    assert.ok(html.includes("♥ 관심 있어요"));
  }
});

test("disables both reactions while saving", () => {
  const html = card({ pending: true });
  assert.equal((html.match(/disabled=""/g) ?? []).length, 2);
});

test("loads unique owners once, includes all pets, and skips the API for an empty feed", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return Response.json({
      data: {
        profile0: { nickname: "산책친구" },
        pets0: [pet],
        profile1: { nickname: "이웃" },
        pets1: [],
      },
    });
  };
  try {
    assert.deepEqual(
      await loadRecommendationDetails("/graphql", [], "fixture"),
      {},
    );
    const details = await loadRecommendationDetails(
      "/graphql",
      ["owner", "owner", "neighbor"],
      "fixture",
    );
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].variables, { id0: "owner", id1: "neighbor" });
    assert.equal(details.owner.nickname, "산책친구");
    assert.deepEqual(details.owner.pets, [pet]);
    assert.deepEqual(details.neighbor.pets, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
