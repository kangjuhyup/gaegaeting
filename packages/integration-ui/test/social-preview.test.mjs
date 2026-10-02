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
const social = await server.ssrLoadModule("/src/lib/social-preview.ts");
const { LikesPage } = await server.ssrLoadModule("/src/pages/LikesPage.tsx");
const { ChatsPage } = await server.ssrLoadModule("/src/pages/ChatsPage.tsx");
const { ChatPage } = await server.ssrLoadModule("/src/pages/ChatPage.tsx");

test("sample text rejects whitespace and oversized drafts while retaining Korean and line breaks", () => {
  assert.equal(social.messageText(" \n "), undefined);
  assert.equal(social.messageText("가".repeat(2001)), undefined);
  assert.equal(social.messageText("가".repeat(2000)).length, 2000);
  assert.equal(
    social.messageText("  함께 산책해요\n주말은 어때요?  "),
    "함께 산책해요\n주말은 어때요?",
  );
});

test("a new message moves that conversation first without leaking another room's messages or changing source order", () => {
  const rooms = [{ id: "one" }, { id: "two" }];
  const messages = [
    { roomId: "one", sentAt: "2026-10-01T01:00:00Z" },
    { roomId: "two", sentAt: "2026-10-02T01:00:00Z" },
  ];
  assert.equal(social.sortRooms(rooms, messages)[0].id, "two");
  const next = [
    ...messages,
    { roomId: "one", sentAt: "2026-10-03T01:00:00Z", body: "새 대화" },
  ];
  assert.equal(social.sortRooms(rooms, next)[0].id, "one");
  assert.deepEqual(
    rooms.map((room) => room.id),
    ["one", "two"],
  );
  assert.equal(social.roomMessages(next, "one").length, 2);
  assert.equal(social.roomMessages(next, "missing").length, 0);
});

test("empty likes and conversations offer a useful route back", () => {
  const likes = renderToStaticMarkup(
    createElement(LikesPage, {
      people: [],
      rooms: [],
      onRecommendations() {},
      onOpenChat() {},
    }),
  );
  const chats = renderToStaticMarkup(
    createElement(ChatsPage, {
      people: [],
      rooms: [],
      messages: [],
      onLikes() {},
      onOpenChat() {},
    }),
  );
  assert.ok(likes.includes("아직 보낸 관심이 없어요"));
  assert.ok(likes.includes("추천 친구 만나기"));
  assert.ok(chats.includes("아직 시작된 대화가 없어요"));
  assert.ok(chats.includes("보낸 관심 보기"));
});

test("conversation text is escaped, empty sending is disabled and the sample storage limit is explicit", () => {
  const html = renderToStaticMarkup(
    createElement(ChatPage, {
      person: social.samplePeople[0],
      messages: [
        {
          id: "local",
          roomId: "one",
          sender: "other",
          body: "<script>alert('sample')</script>",
          sentAt: "2026-10-02T01:00:00Z",
        },
      ],
      onBack() {},
      onSend() {},
    }),
  );
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes('disabled=""'));
  assert.ok(html.includes("서버에 저장되지 않아요"));
  assert.ok(html.includes('maxLength="2000"'));
});
