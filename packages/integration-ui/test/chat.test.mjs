import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const originalWindow = globalThis.window;
globalThis.window = {};
const server = await createServer({ configFile: false, plugins: [react()], cacheDir: 'node_modules/.vite/qa-ssr', root: fileURLToPath(new URL('../', import.meta.url)),
  server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true, entries: [] }, appType: 'custom' });
after(async () => { await server.close(); if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow; });
const chat = await server.ssrLoadModule('/src/lib/chat-api.ts');
const { LiveChatMessages } = await server.ssrLoadModule('/src/pages/LiveChat.tsx');
const message = (id, roomId = 1, senderId = 'me', body = '안녕하세요') => ({ id, roomId, senderId, body, clientMessageId: null, sentAt: '2026-10-03T00:00:00Z' });

test('재연결 후 들어온 대화는 ID로 병합하고 다른 방 메시지는 표시하지 않는다', () => {
  const current = [message(2), message(4)];
  const merged = chat.mergeMessages(current, [message(3), message(4), message(1, 2)], 1);
  assert.deepEqual(merged.map(item => item.id), [2,3,4]);
  assert.deepEqual(current.map(item => item.id), [2,4]);
});
test('전송 결과가 불확실할 때 같은 본문은 기존 전송 ID로 재시도한다', () => {
  const attempt = chat.messageAttempt('  산책해요  ');
  assert.equal(chat.messageAttempt('산책해요', attempt), attempt);
  assert.notEqual(chat.messageAttempt('다른 메시지', attempt).clientMessageId, attempt.clientMessageId);
  assert.throws(() => chat.messageAttempt(' \n '));
  assert.throws(() => chat.messageAttempt('가'.repeat(2001)));
});
test('채팅 query와 mutation은 기존 Gateway GraphQL 주소와 인증 토큰을 사용한다', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options, payload: JSON.parse(options.body) });
    const field = calls.length === 1 ? 'chatRooms' : calls.length === 2 ? 'sendChatMessage' : 'markChatRead';
    return { ok: true, status: 200, json: async () => ({ data: { [field]: field === 'chatRooms' ? [] : field === 'markChatRead' ? true : message(1) } }) };
  };
  try {
    const api = chat.createChatApi('https://api.example.test/gateway/graphql', 'opaque-qa-token');
    await api.rooms(); await api.send(1, { body: '인사', clientMessageId: 'qa-id' }); await api.read(1,1);
    for (const call of calls) { assert.equal(call.url, 'https://api.example.test/gateway/graphql'); assert.equal(call.method, 'POST'); assert.equal(call.headers.authorization, 'Bearer opaque-qa-token'); }
    assert.match(calls[0].payload.query, /query ChatRooms/);
    assert.match(calls[1].payload.query, /mutation SendChatMessage/);
    assert.deepEqual(calls[1].payload.variables.input, { roomId: 1, body: '인사', clientMessageId: 'qa-id' });
    assert.equal('senderId' in calls[1].payload.variables.input, false);
    assert.match(calls[2].payload.query, /markChatRead/);
  } finally { globalThis.fetch = original; }
});
test('HTTP 성공이어도 GraphQL 전송 오류는 실패로 보고하여 입력과 재시도 정보를 보존한다', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ data: null, errors: [{ message: '종료된 매칭에는 메시지를 보낼 수 없습니다.' }] }) });
  try { await assert.rejects(chat.createChatApi('https://api.example.test/gateway/graphql','qa').send(1,{ body: '인사', clientMessageId: 'qa' }), /종료된 매칭/); }
  finally { globalThis.fetch = original; }
});
test('실시간 연결은 같은 GraphQL 경로의 WSS를 사용하며 URL에 토큰을 넣지 않는다', () => {
  assert.equal(chat.chatWebsocketUrl('https://api.example.test/gateway/graphql?token=not-allowed'), 'wss://api.example.test/gateway/graphql');
  assert.equal(chat.chatWebsocketUrl('http://localhost:4000/gateway/graphql'), 'ws://localhost:4000/gateway/graphql');
});
test('실제 대화는 본문 HTML을 이스케이프하고 상대가 읽은 내 메시지에만 읽음을 표시한다', () => {
  const html = renderToStaticMarkup(createElement(LiveChatMessages, { name: '산책 친구', otherUserId: 'other', otherLastReadMessageId: 1,
    messages: [message(1,1,'me','<script>unsafe</script>'), message(2), message(3,1,'other')] }));
  assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>'));
  assert.equal((html.match(/class="chat-read"/g) ?? []).length, 1);
  assert.ok(html.includes('role="log"')); assert.ok(html.includes('aria-live="polite"'));
  assert.ok(!html.includes('샘플')); assert.ok(!html.includes('서버에 저장되지'));
});
