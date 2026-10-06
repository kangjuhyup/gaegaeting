import { randomUUID } from 'node:crypto';
import dns from 'node:dns';
import { createServer, type Server } from 'node:http';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import { Client } from 'pg';
import { createClient } from 'graphql-ws';
import { WebSocket } from 'ws';
import { createInternalAuthAssertion } from '@core/auth-assertion';
import { runSqlMigrations, initialChatSchema } from '@core/database';
import type { UserPrincipal } from '@core/auth';
import { chatMessagingMigration } from '../src/migrations/chat-messaging.migration.js';
import { MatchPairsPort } from '../src/room/application/port/match-pairs.port.js';
import { RoomService } from '../src/room/application/service/room.service.js';
import { ChatPostgresConnection } from '../src/common/infrastructure/postgres-connection.js';
import { PostgresChatEvents } from '../src/common/infrastructure/postgres-chat.events.js';
import { startChatWebsocket } from '../../gateway/src/chat-websocket.js';
import { Gateway } from '../../gateway/src/gateway.js';
import kafkaJs, { Kafka, logLevel } from 'kafkajs';
import { PairEventsConsumer } from '../src/room/infrastructure/event/pair-events.consumer.js';

const databaseUrl = process.env.CHAT_TEST_DATABASE_URL;
const { KafkaJSDeleteGroupsError } = kafkaJs;
const suite = databaseUrl ? describe : describe.skip;
const secret = 'chat-qa-internal-secret-at-least-32-characters';
const a = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
const b = '01ARZ3NDEKTSV4RRFFQ69G5FAW';
const c = '01ARZ3NDEKTSV4RRFFQ69G5FAX';
const outsider = '01ARZ3NDEKTSV4RRFFQ69G5FAY';
const pairs = [{ pairId: 1, leftUserId: a, rightUserId: b }, { pairId: 2, leftUserId: a, rightUserId: c }];
const principal = (userId = a, scopes = ['match:read', 'match:write']) => ({
  userId, tenantId: 'chat-qa', subject: `subject-${userId}`, scopes,
  issuedAt: Math.floor(Date.now()/1000), expiresAt: Math.floor(Date.now()/1000)+3600,
}) as UserPrincipal;
const messageFields = 'id roomId senderId body clientMessageId sentAt';
async function within<T>(promise: Promise<T>, ms = 5000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try { return await Promise.race([promise, new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error('Timed out waiting for chat event')), ms); })]); }
  finally { clearTimeout(timer!); }
}


suite('매칭된 사용자만 참여하는 영속 채팅', () => {
  let app: INestApplication;
  let endpoint: string;
  let db: Client;
  let active = true;
  let roomId: number;
  let secondRoomId: number;
  let closeBridge: (() => Promise<void>) | undefined;
  let bridge: Server | undefined;
  const disposers: Array<() => void> = [];
  async function request(query: string, variables = {}, userId = a, scopes?: string[]) {
    const response = await fetch(endpoint, { method: 'POST', headers: {
      'content-type': 'application/json', 'x-gaegaeting-principal': createInternalAuthAssertion(principal(userId, scopes), {
        secret, issuer: 'gaegaeting-gateway', audience: 'chat', ttlSeconds: 30,
      }),
    }, body: JSON.stringify({ query, variables }) });
    return response.json() as Promise<any>;
  }
  const send = (body: string, userId = a, clientMessageId = randomUUID(), id = roomId) => request(
    `mutation Send($input: SendChatMessageInput!) { sendChatMessage(input: $input) { ${messageFields} } }`,
    { input: { roomId: id, body, clientMessageId } }, userId);
  const history = (userId = a, cursor = {}, id = roomId) => request(
    `query Messages($roomId: Int!, $cursor: ChatMessageCursorInput) { chatMessages(roomId: $roomId, cursor: $cursor) { messages { ${messageFields} } hasMore } }`,
    { roomId: id, cursor }, userId);
  const read = (messageId: number, userId = b) => request(
    'mutation Read($roomId: Int!, $messageId: Int!) { markChatRead(roomId: $roomId, messageId: $messageId) }', { roomId, messageId }, userId);
  const room = (userId = a) => request('query Room($id: Int!) { chatRoom(roomId: $id) { id unread lastReadMessageId otherLastReadMessageId } }', { id: roomId }, userId);

  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    if (!url.pathname.endsWith('_qa') || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
      throw new Error('Chat integration tests require an isolated loopback *_qa database');
    }
    Object.assign(process.env, { NODE_ENV: 'test', CHAT_SERVICE_API_PORT: '2802',
      DATABASE_HOST: url.hostname, DATABASE_PORT: url.port || '5432', DATABASE_USERNAME: url.username,
      DATABASE_PASSWORD: url.password || randomUUID(), DATABASE_NAME: url.pathname.slice(1), DATABASE_SSL_MODE: 'disable',
      DATABASE_LOG: 'false', INTERNAL_AUTH_ASSERTION_SECRET: secret, MATCH_SERVICE_HOST: 'http://127.0.0.1:2801', CHAT_KAFKA_ENABLED: 'false', LOG_LEVEL: 'silent' });
    db = new Client({ connectionString: databaseUrl }); await db.connect();
    await db.query('drop schema public cascade; create schema public');
    const migration = { connection: { host: url.hostname, port: Number(url.port || 5432), user: url.username,
      password: url.password, database: url.pathname.slice(1), ssl: false as const },
      historyTable: 'chat_migrations', lockKey: 'ggt_chat:migrations', migrations: [initialChatSchema, chatMessagingMigration] };
    await runSqlMigrations(migration); await runSqlMigrations(migration);
    expect((await db.query('select * from chat_migrations')).rowCount).toBe(2);
    const { AppModule } = await import('../src/app.module.js');
    const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(MatchPairsPort).useValue({
      activePairs: async (user: UserPrincipal) => active ? pairs.filter(pair => [pair.leftUserId, pair.rightUserId].includes(user.userId)) : [],
    }).compile();
    app = module.createNestApplication({ logger: false }); app.setGlobalPrefix('chat');
    await app.listen(0, '127.0.0.1');
    endpoint = `${await app.getUrl()}/chat/graphql`;
  }, 30000);
  beforeEach(async () => {
    active = true;
    await db.query('truncate conversation restart identity cascade');
    const rooms = await app.get(RoomService).syncRooms(principal());
    roomId = rooms.find(item => item.pairId === 1)!.id;
    secondRoomId = rooms.find(item => item.pairId === 2)!.id;
  });
  afterEach(async () => {
    disposers.splice(0).forEach(dispose => dispose());
    await closeBridge?.(); closeBridge = undefined;
    if (bridge) await new Promise<void>(resolve => bridge!.close(() => resolve()));
    bridge = undefined;
  });
  afterAll(async () => { await app?.close(); await db?.end(); });

  it('readiness는 DB 연결을 확인하고 장애 시 503을 반환하지만 liveness는 유지한다', async () => {
    const base = await app.getUrl();
    expect((await fetch(`${base}/chat/health/ready`)).status).toBe(200);
    const pool = app.get(ChatPostgresConnection).pool;
    const original = pool.query;
    try {
      pool.query = (() => Promise.reject(new Error('isolated QA database failure'))) as typeof pool.query;
      expect((await fetch(`${base}/chat/health/ready`)).status).toBe(503);
      expect((await fetch(`${base}/chat/health`)).status).toBe(200);
    } finally { pool.query = original; }
  });

  it('같은 매칭 이벤트가 동시에 재처리되어도 방 하나와 참여자 두 명을 유지한다', async () => {
    const ids = await Promise.all(Array.from({ length: 5 }, () => app.get(RoomService).createPairRoom(pairs[0])));
    expect(new Set(ids)).toEqual(new Set([roomId]));
    expect((await db.query('select * from participant where conversation_id = $1', [roomId])).rowCount).toBe(2);
    await expect(app.get(RoomService).createPairRoom({ ...pairs[0], rightUserId: outsider })).rejects.toThrow('매칭 참여자가');
  });
  it('발신자는 인증 정보로 결정하고 새 DB 연결에서도 저장된 한국어 본문을 조회한다', async () => {
    const result = await send('  함께 산책해요\n주말은 어때요?  ');
    expect(result.errors).toBeUndefined();
    expect(result.data.sendChatMessage.senderId).toBe(a);
    const reopened = new Client({ connectionString: databaseUrl }); await reopened.connect();
    try { expect((await reopened.query('select body from message')).rows[0].body).toBe('함께 산책해요\n주말은 어때요?'); }
    finally { await reopened.end(); }
    expect((await history(b)).data.chatMessages.messages[0].body).toBe('함께 산책해요\n주말은 어때요?');
  });
  it('제3자는 방과 메시지를 조회하거나 전송하거나 읽음 처리할 수 없다', async () => {
    const sent = (await send('참여자만 볼 수 있어요')).data.sendChatMessage;
    for (const result of [await history(outsider), await send('위조', outsider), await read(sent.id, outsider), await room(outsider)]) {
      expect(result.errors).toBeDefined(); expect(result.data).toBeNull();
    }
    expect((await request('query { chatRooms { id } }', {}, outsider)).data.chatRooms).toEqual([]);
  });
  it('내부 assertion이 없거나 읽기 scope가 없으면 대화를 노출하지 않는다', async () => {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', 'x-jwt-payload': JSON.stringify(principal()) }, body: JSON.stringify({ query: '{ chatRooms { id } }' }) });
    expect((await response.json() as any).errors).toBeDefined();
    expect((await request('{ chatRooms { id } }', {}, a, [])).errors).toBeDefined();
    expect((await request('mutation { sendChatMessage(input: {roomId: 1, body: "hi", clientMessageId: "id", senderId: "forged"}) { id } }')).errors).toBeDefined();
  });
  it('같은 전송 ID의 동시 재시도는 메시지 하나만 만들고 다른 본문으로 재사용하면 거절한다', async () => {
    const id = randomUUID(); const results = await Promise.all([send('인사', a, id), send('인사', a, id)]);
    expect(results[0].data.sendChatMessage.id).toBe(results[1].data.sendChatMessage.id);
    expect((await db.query('select * from message')).rowCount).toBe(1);
    expect((await send('다른 인사', a, id)).errors).toBeDefined();
  });
  it('공백, 길이, UUID와 양방향 cursor 경계 위반을 거절한다', async () => {
    for (const body of [' \n ', '가'.repeat(2001)]) expect((await send(body)).errors).toBeDefined();
    expect((await send('인사', a, 'invalid')).errors).toBeDefined();
    expect((await send('가'.repeat(2000))).errors).toBeUndefined();
    for (const cursor of [{ limit: 0 }, { limit: 101 }, { before: 1, after: 2 }, { after: -1 }]) expect((await history(a, cursor)).errors).toBeDefined();
  });
  it('동시 전송과 최신·과거·신규 페이지에서 메시지를 중복하거나 누락하지 않는다', async () => {
    const results = await Promise.all(Array.from({ length: 6 }, (_, i) => send(`동시 메시지 ${i}`, i % 2 ? b : a)));
    expect(results.every(result => !result.errors)).toBe(true);
    const latest = (await history(a, { limit: 2 })).data.chatMessages;
    const older = (await history(a, { before: latest.messages[0].id, limit: 4 })).data.chatMessages;
    const newPage = (await history(a, { after: older.messages.at(-1).id, limit: 2 })).data.chatMessages;
    expect(latest.hasMore).toBe(true); expect(older.hasMore).toBe(false);
    const ids = [...older.messages, ...latest.messages].map(message => message.id);
    expect(ids).toEqual([...ids].sort((a, b) => a-b)); expect(new Set(ids).size).toBe(6);
    expect(newPage.messages.map(message => message.id)).toEqual(latest.messages.map(message => message.id));
  });
  it('읽음 위치는 같은 방의 실제 메시지까지만 전진하며 안 읽은 수와 상대 읽음 표시를 갱신한다', async () => {
    const first = (await send('첫 메시지')).data.sendChatMessage;
    const second = (await send('둘째 메시지')).data.sendChatMessage;
    expect((await room(b)).data.chatRoom.unread).toBe(2);
    expect((await read(second.id)).data.markChatRead).toBe(true);
    await read(first.id);
    expect((await room(b)).data.chatRoom.unread).toBe(0);
    expect((await room(a)).data.chatRoom.otherLastReadMessageId).toBe(second.id);
    const other = (await send('다른 방', a, randomUUID(), secondRoomId)).data.sendChatMessage;
    expect((await read(other.id)).errors).toBeDefined();
    expect((await read(2147483647)).errors).toBeDefined();
  });
  it('취소된 매칭은 기록을 유지하면서 새 메시지를 거절한다', async () => {
    await send('취소 이전'); active = false;
    expect((await send('취소 이후')).errors).toBeDefined();
    expect((await history()).data.chatMessages.messages).toHaveLength(1);
  });
  it('다른 Chat 인스턴스에서도 커밋한 메시지와 읽음 알림을 수신하고 rollback 알림은 전달하지 않는다', async () => {
    const listener = new PostgresChatEvents(app.get(ConfigService)); await listener.onModuleInit();
    const events = listener.events(roomId); await events.next();
    try {
      const next = events.next();
      const sent = (await send('다른 인스턴스로 전파')).data.sendChatMessage;
      expect((await within(next)).value).toMatchObject({ roomId, kind: 'MESSAGE', messageId: sent.id });
      const readEvent = events.next(); await read(sent.id);
      expect((await within(readEvent)).value.kind).toBe('READ');
      await db.query('begin'); await db.query("select pg_notify('gaegaeting_chat', $1)", [JSON.stringify({ roomId, kind: 'MESSAGE', messageId: 999 })]); await db.query('rollback');
      const afterRollback = events.next(); const committed = (await send('커밋된 알림')).data.sendChatMessage;
      expect((await within(afterRollback)).value.messageId).toBe(committed.id);
    } finally { await events.return?.(); await listener.onModuleDestroy(); }
  });
  it('WebSocket에서도 Gateway가 토큰을 검증하고 참여자에게 새 메시지 변경을 전달한다', async () => {
    bridge = createServer(); await new Promise<void>(resolve => bridge!.listen(0, '127.0.0.1', resolve));
    const bridgeUrl = `ws://127.0.0.1:${(bridge.address() as any).port}/gateway/graphql`;
    closeBridge = startChatWebsocket(bridge, { serviceUrl: endpoint, secret, allowedOrigins: [],
      authenticate: async (req, res, next) => { if (req.headers.authorization === 'Bearer qa-b') { req.authenticatedPrincipal = principal(b); next(); } else res.status(401).json({}); } });
    const client = createClient({ url: bridgeUrl, webSocketImpl: WebSocket, connectionParams: { authorization: 'Bearer qa-b', 'x-gaegaeting-principal': 'forged' }, retryAttempts: 0 });
    let resolveReady: () => void; const ready = new Promise<void>(resolve => { resolveReady = resolve; });
    let resolveMessage: (event: any) => void; const arrived = new Promise<any>(resolve => { resolveMessage = resolve; });
    const dispose = client.subscribe({ query: 'subscription($id: Int) { chatEvents(roomId: $id) { roomId kind messageId } }', variables: { id: roomId } }, {
      next: result => { const event = (result.data as any)?.chatEvents; if (event?.kind === 'RESYNC') resolveReady(); if (event?.kind === 'MESSAGE') resolveMessage(event); },
      error: error => resolveMessage({ error }), complete: () => {},
    });
    disposers.push(() => { dispose(); void client.dispose(); });
    await within(ready);
    const sent = (await send('웹소켓 수신')).data.sendChatMessage;
    expect(await within(arrived)).toMatchObject({ roomId, kind: 'MESSAGE', messageId: sent.id });
  }, 15000);
  it('실시간 구독에서도 다른 방 접근과 위조 인증을 거절한다', async () => {
    bridge = createServer(); await new Promise<void>(resolve => bridge!.listen(0, '127.0.0.1', resolve));
    const url = `ws://127.0.0.1:${(bridge.address() as any).port}/gateway/graphql`;
    closeBridge = startChatWebsocket(bridge, { serviceUrl: endpoint, secret, allowedOrigins: [],
      authenticate: async (req, res, next) => { if (req.headers.authorization === 'Bearer qa-outsider') { req.authenticatedPrincipal = principal(outsider); next(); } else res.status(401).json({}); } });
    for (const authorization of ['Bearer qa-outsider', 'Bearer invalid']) {
      const client = createClient({ url, webSocketImpl: WebSocket, retryAttempts: 0, connectionParams: { authorization } });
      const rejected = new Promise<unknown>(resolve => {
        const dispose = client.subscribe({ query: 'subscription($id: Int) { chatEvents(roomId: $id) { kind } }', variables: { id: roomId } }, {
          next: result => { if (result.errors) resolve(result.errors); else resolve('leaked event'); }, error: resolve, complete: () => resolve('unexpected completion'),
        });
        disposers.push(() => { dispose(); void client.dispose(); });
      });
      expect(await within(rejected)).not.toBe('leaked event');
    }
  });
  it('오래 열린 연결에서 새 구독을 시작할 때 만료된 초기 assertion 대신 새 인증 정보를 사용한다', async () => {
    bridge = createServer(); await new Promise<void>(resolve => bridge!.listen(0, '127.0.0.1', resolve));
    const url = `ws://127.0.0.1:${(bridge.address() as any).port}/gateway/graphql`;
    closeBridge = startChatWebsocket(bridge, { serviceUrl: endpoint, secret, allowedOrigins: [],
      authenticate: async (req, _res, next) => { req.authenticatedPrincipal = principal(b); next(); } });
    let connected: () => void; const ready = new Promise<void>(resolve => { connected = resolve; });
    const client = createClient({ url, webSocketImpl: WebSocket, lazy: false, retryAttempts: 0,
      connectionParams: { authorization: 'Bearer qa-b' }, on: { connected: () => connected() } });
    disposers.push(() => { void client.dispose(); });
    await within(ready);
    const originalNow = Date.now;
    Date.now = () => originalNow() + 61000;
    try {
      const event = new Promise<any>(resolve => {
        const dispose = client.subscribe({ query: 'subscription($id: Int) { chatEvents(roomId: $id) { kind } }', variables: { id: roomId },
          extensions: { internalAssertion: 'browser-forged-assertion' } }, {
          next: resolve, error: error => resolve({ errors: error }), complete: () => {},
        });
        disposers.push(dispose);
      });
      expect((await within(event)).data.chatEvents.kind).toBe('RESYNC');
    } finally { Date.now = originalNow; }
  });
  it('토큰이 철회되면 유지 중인 WebSocket 연결도 종료한다', async () => {
    let allowed = true;
    bridge = createServer(); await new Promise<void>(resolve => bridge!.listen(0, '127.0.0.1', resolve));
    const url = `ws://127.0.0.1:${(bridge.address() as any).port}/gateway/graphql`;
    closeBridge = startChatWebsocket(bridge, { serviceUrl: endpoint, secret, allowedOrigins: [], recheckMs: 50,
      authenticate: async (req, res, next) => { if (allowed) { req.authenticatedPrincipal = principal(b); next(); } else res.status(401).json({}); } });
    const client = createClient({ url, webSocketImpl: WebSocket, retryAttempts: 0, connectionParams: { authorization: 'Bearer qa-b' } });
    let ready: () => void; const started = new Promise<void>(resolve => { ready = resolve; });
    const rejected = new Promise<unknown>(resolve => {
      const dispose = client.subscribe({ query: 'subscription($id: Int) { chatEvents(roomId: $id) { kind } }', variables: { id: roomId } }, {
        next: () => ready(), error: resolve, complete: () => {},
      });
      disposers.push(() => { dispose(); void client.dispose(); });
    });
    await within(started); allowed = false;
    expect((await within(rejected) as { code: number }).code).toBe(4401);
  });
  (process.env.CHAT_TEST_KAFKA_BROKERS ? it : it.skip)('실제 Kafka의 매칭 생성 이벤트와 재전송을 소비해 방 하나를 생성한다', async () => {
    // Local Docker brokers can advertise a hostname unavailable on the host.
    const originalLookup = dns.lookup;
    const alias = process.env.CHAT_TEST_KAFKA_HOST_ALIAS?.split('=');
    if (alias?.length === 2) dns.lookup = ((host: string, ...args: unknown[]) =>
      (originalLookup as Function)(host === alias[0] ? alias[1] : host, ...args)) as typeof dns.lookup;
    const prefix = `chat-qa-${randomUUID()}`;
    const topic = `${prefix}.chat.room.created.v1`;
    const kafka = new Kafka({ clientId: prefix, brokers: process.env.CHAT_TEST_KAFKA_BROKERS!.split(','), logLevel: logLevel.NOTHING });
    const admin = kafka.admin(); const producer = kafka.producer();
    let consumer: PairEventsConsumer | undefined;
    let processed = 0;
    try {
      await admin.connect();
      await admin.createTopics({ topics: [{ topic, numPartitions: 1, replicationFactor: 1 }], waitForLeaders: true });
      await producer.connect();
      consumer = new PairEventsConsumer(new ConfigService({ CHAT_KAFKA_ENABLED: true, KAFKA_BROKERS: process.env.CHAT_TEST_KAFKA_BROKERS!.split(','),
        CHAT_KAFKA_GROUP_ID: prefix, KAFKA_TOPIC_PREFIX: prefix }), {
          createPairRoom: async pair => { const id = await app.get(RoomService).createPairRoom(pair); processed++; return id; },
        } as RoomService);
      await consumer.onModuleInit();
      const payload = { pairId: 3, leftUserId: b, rightUserId: c };
      const legacy = { _pairId: payload.pairId, _leftUserId: payload.leftUserId, _rightUserId: payload.rightUserId };
      await producer.send({ topic, messages: [{ value: JSON.stringify(payload) }, { value: JSON.stringify(legacy) }] });
      const deadline = Date.now() + 10000;
      let created = false;
      while (Date.now() < deadline) {
        const count = (await db.query('select count(*)::int as count from conversation where pair_id = 3')).rows[0].count;
        if (count === 1 && processed === 2) { created = true; break; }
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      expect(created).toBe(true);
      const ids = (await app.get(RoomService).rooms(b)).filter(room => room.pairId === 3).map(room => room.id);
      expect(ids).toHaveLength(1);
      expect((await db.query('select * from participant where conversation_id = $1', [ids[0]])).rowCount).toBe(2);
    } finally {
      try {
        await consumer?.onModuleDestroy(); await producer.disconnect();
        for (let retry = 0; ; retry++) {
          try { await admin.deleteGroups([prefix]); break; }
          catch (error) {
            if (error instanceof KafkaJSDeleteGroupsError && error.groups.every(group => group.errorCode === 69)) break;
            if (!(error instanceof KafkaJSDeleteGroupsError) || retry >= 20 ||
                error.groups.some(group => group.errorCode !== 68)) throw error;
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        await admin.deleteTopics({ topics: [topic] });
      } finally { await admin.disconnect(); dns.lookup = originalLookup; }
    }
  }, 25000);
  it('Chat 서브그래프를 기존 Apollo Gateway에 조합해 HTTP query와 mutation을 실행한다', async () => {
    const fake = createServer(async (req, res) => {
      const name = req.url === '/account' ? 'account' : 'match';
      res.setHeader('content-type','application/json');
      res.end(JSON.stringify({ data: { __typename: 'Query', _service: { sdl: `extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: []) type Query { ${name}Ping: String }` } } }));
    });
    await new Promise<void>(resolve => fake.listen(0,'127.0.0.1',resolve));
    const base = `http://127.0.0.1:${(fake.address() as any).port}`;
    Object.assign(process.env, { ACCOUNT_SERVICE_URL: base+'/account', MATCH_SERVICE_URL: base+'/match', CHAT_SERVICE_URL: endpoint });
    const gateway = new Gateway(secret);
    try {
      await gateway.initialize();
      const response = await gateway.getServer().executeOperation({ query: '{ chatRooms { id pairId } }' }, { contextValue: { authenticatedPrincipal: principal(a) } });
      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') { expect(response.body.singleResult.errors).toBeUndefined(); expect((response.body.singleResult.data as any).chatRooms).toHaveLength(2); }
    } finally { await gateway.shutdown(); await new Promise<void>(resolve => fake.close(() => resolve())); delete process.env.CHAT_SERVICE_URL; }
  }, 20000);
});
