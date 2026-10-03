import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { Writable } from 'node:stream';
import { after, before, beforeEach, test } from 'node:test';
import { requestTraceMiddleware } from '../packages/core/util/dist/src/trace.js';
import { createPinoLoggerOptions } from '../packages/core/logger/dist/src/common/pino-logger.options.js';
import { FetchHttpClient } from '../packages/core/http/dist/src/client/fetch.client.js';
import { createEdgeAssertion, EDGE_ASSERTION_HEADER } from '../packages/gateway/dist/src/auth/edge-assertion.js';

const require = createRequire(new URL('../packages/core/logger/package.json', import.meta.url));
const pinoHttp = require('pino-http');
const secret = 'trace-test-secret-at-least-32-characters';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const requests = [];
const serviceLogs = [];
const gatewayLogs = [];
const client = new FetchHttpClient();
client.setDefaultRetryCount(0);
let fixtureServer, runtime, fixtureUrl, gatewayUrl, originalEnv, originalLog;

function authHeaders() {
  return {
    authorization: 'Bearer fixture-token',
    [EDGE_ASSERTION_HEADER]: createEdgeAssertion({
      issuer: 'https://auth.example/oidc', tenantId: 'tenant', subject: 'subject',
      scopes: [], issuedAt: 1, expiresAt: Math.floor(Date.now() / 1000) + 60,
    }, 'fixture-token', secret),
  };
}

async function listen(server) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

async function close(server) {
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

before(async () => {
  originalEnv = { ...process.env };
  originalLog = console.log;
  console.log = (...args) => {
    if (typeof args[0] === 'string' && args[0].startsWith('{')) gatewayLogs.push(JSON.parse(args[0]));
  };
  const stream = new Writable({ write(chunk, _encoding, next) {
    serviceLogs.push(JSON.parse(chunk.toString())); next();
  } });
  const loggers = Object.fromEntries(['account', 'match'].map(name => [name,
    pinoHttp(createPinoLoggerOptions({ name, pretty: false }).pinoHttp, stream),
  ]));
  fixtureServer = createServer((req, res) => {
    const service = req.url.startsWith('/match') ? 'match' : 'account';
    requestTraceMiddleware(req, res, () => loggers[service](req, res, () => {
      void handleFixture(req, res).catch(error => {
        res.writeHead(500).end(JSON.stringify({ errors: [{ message: error.message }] }));
      });
    }));
  });
  fixtureUrl = await listen(fixtureServer);
  Object.assign(process.env, {
    NODE_ENV: 'production', GATEWAY_PORT: '0', GATEWAY_AUTH_MODE: 'edge',
    INTERNAL_AUTH_ASSERTION_SECRET: secret, EDGE_AUTH_ASSERTION_SECRET: secret,
    ACCOUNT_SERVICE_URL: `${fixtureUrl}/account/graphql`,
    MATCH_SERVICE_URL: `${fixtureUrl}/match/graphql`,
    ACCOUNT_SUBJECT_RESOLUTION_URL: `${fixtureUrl}/account/internal/subjects/resolve`,
    APOLLO_ENABLE_SANDBOX: 'false',
  });
  const { bootstrap } = await import('../packages/gateway/dist/src/main.js');
  runtime = await bootstrap();
  if (!runtime.httpServer.listening) await new Promise(resolve => runtime.httpServer.once('listening', resolve));
  gatewayUrl = `http://127.0.0.1:${runtime.httpServer.address().port}`;
});

async function handleFixture(req, res) {
  let input = '';
  for await (const chunk of req) input += chunk;
  const body = input ? JSON.parse(input) : {};
  const schemaRequest = body.query?.includes('_service');
  if (!schemaRequest) {
    requests.push({ path: req.url, traceId: req.headers['x-trace-id'] });
    req.log.info({ phase: 'application' }, 'Handling service request');
  }
  res.setHeader('content-type', 'application/json');
  if (schemaRequest) {
    const field = req.url.startsWith('/match') ? 'matchName' : 'accountName';
    res.end(JSON.stringify({ data: { _service: { sdl: `type Query { ${field}: String }` } } }));
  } else if (req.url === '/account/internal/subjects/resolve') {
    res.end(JSON.stringify({ user_id: 'user-123' }));
  } else if (req.url === '/account/users/current') {
    res.end(JSON.stringify({ name: 'Account' }));
  } else if (req.url === '/match/graphql') {
    await client.get(`${fixtureUrl}/account/users/current`);
    res.end(JSON.stringify(req.headers['x-trace-id'] === 'failing-request'
      ? { data: { matchName: null }, errors: [{ message: 'fixture failure' }] }
      : { data: { matchName: 'Match' } }));
  } else {
    res.end(JSON.stringify({ data: { accountName: 'Account' } }));
  }
}

beforeEach(() => { requests.length = 0; serviceLogs.length = 0; gatewayLogs.length = 0; });
after(async () => {
  if (runtime) {
    process.removeListener('SIGTERM', runtime.shutdown);
    process.removeListener('SIGINT', runtime.shutdown);
    await close(runtime.httpServer);
    await runtime.gateway.shutdown();
  }
  await close(fixtureServer);
  console.log = originalLog;
  if (originalEnv) {
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  }
});

async function graphql(traceId, path = '/gateway/graphql') {
  const response = await fetch(`${gatewayUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders(), ...(traceId ? { 'x-trace-id': traceId } : {}) },
    body: JSON.stringify({ query: '{ accountName matchName }' }),
  });
  return { response, body: await response.json(), traceId: response.headers.get('x-trace-id') };
}

function assertTracedCalls(id) {
  const calls = requests.filter(req => req.traceId === id);
  assert.deepEqual(calls.map(req => req.path).sort(), [
    '/account/graphql', '/account/internal/subjects/resolve', '/account/users/current', '/match/graphql',
  ]);
  const logs = serviceLogs.filter(log => log.traceId === id);
  assert.equal(logs.filter(log => log.phase === 'application').length, 4);
  assert.equal(logs.filter(log => log.msg === 'request completed').length, 4);
  assert.ok(logs.every(log => log.req.id === id));
  assert.ok(gatewayLogs.some(log => log.traceId === id && log.statusCode === 200));
}

test('one inbound ID spans authentication, parallel subgraphs, nested HTTP calls and all request logs', async () => {
  const { response, body, traceId } = await graphql('client-request-123');
  assert.equal(response.status, 200);
  assert.equal(traceId, 'client-request-123');
  assert.deepEqual(body.data, { accountName: 'Account', matchName: 'Match' });
  assert.equal(response.headers.get('access-control-expose-headers'), 'X-Trace-Id');
  assertTracedCalls(traceId);
});

test('concurrent requests without IDs each receive one distinct UUID shared by every service', async () => {
  const results = await Promise.all([graphql(), graphql(undefined, '/graphql')]);
  assert.notEqual(results[0].traceId, results[1].traceId);
  for (const { response, traceId, body } of results) {
    assert.equal(response.status, 200);
    assert.match(traceId, uuid);
    assert.deepEqual(body.data, { accountName: 'Account', matchName: 'Match' });
    assertTracedCalls(traceId);
  }
  assert.equal(requests.length, 8);
});

test('ambiguous client IDs are replaced before the first service call', async () => {
  const { traceId } = await graphql('one,two');
  assert.match(traceId, uuid);
  assertTracedCalls(traceId);
});

test('GraphQL service errors retain the same ID in the response and request logs', async () => {
  const { traceId, body } = await graphql('failing-request');
  assert.equal(traceId, 'failing-request');
  assert.equal(body.errors[0].message, 'fixture failure');
  assertTracedCalls(traceId);
});

test('authentication and JSON parsing errors still return their request ID', async () => {
  const unauthorized = await fetch(`${gatewayUrl}/gateway/graphql`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-trace-id': 'unauthorized-request' }, body: '{}',
  });
  assert.equal(unauthorized.status, 401);
  assert.equal(unauthorized.headers.get('x-trace-id'), 'unauthorized-request');
  await unauthorized.arrayBuffer();
  const invalidJson = await fetch(`${gatewayUrl}/gateway/graphql`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-trace-id': 'invalid-json' }, body: '{',
  });
  assert.equal(invalidJson.status, 400);
  assert.equal(invalidJson.headers.get('x-trace-id'), 'invalid-json');
  await invalidJson.arrayBuffer();
  assert.equal(requests.length, 0);
  assert.ok(gatewayLogs.some(log => log.traceId === 'unauthorized-request' && log.statusCode === 401));
  assert.ok(gatewayLogs.some(log => log.traceId === 'invalid-json' && log.statusCode === 400));
});

test('CORS preflight permits the trace header', async () => {
  const response = await fetch(`${gatewayUrl}/gateway/graphql`, { method: 'OPTIONS' });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('access-control-allow-headers'), /X-Trace-Id/);
  assert.match(response.headers.get('x-trace-id'), uuid);
  await response.arrayBuffer();
});
