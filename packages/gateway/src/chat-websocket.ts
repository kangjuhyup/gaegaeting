import type { Server, IncomingMessage } from 'node:http';
import type { Response, NextFunction } from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import { getOperationAST, parse } from 'graphql';
import { createInternalAuthAssertion } from '@core/auth-assertion';
import type { GatewayPrincipal, AuthenticatedRequest } from './auth/authentication-middleware.js';

type Authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export async function authenticateChatSocket(token: string, authenticate: Authenticate): Promise<GatewayPrincipal> {
  let status = 401;
  const req = { headers: { authorization: `Bearer ${token}` } } as AuthenticatedRequest;
  const res = { status(code: number) { status = code; return this; }, json() { return this; } } as unknown as Response;
  let accepted = false;
  await authenticate(req, res, () => { accepted = true; });
  if (!accepted || !req.authenticatedPrincipal) throw new Error(String(status));
  return req.authenticatedPrincipal;
}
export function startChatWebsocket(server: Server, options: {
  serviceUrl: string; secret: string; authenticate: Authenticate; allowedOrigins: string[]; recheckMs?: number;
}) {
  const upstreamUrl = new URL(options.serviceUrl);
  upstreamUrl.protocol = upstreamUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024,
    handleProtocols: protocols => protocols.has('graphql-transport-ws') ? 'graphql-transport-ws' : false });
  const upgrade = (request: IncomingMessage, socket: import('node:stream').Duplex, head: Buffer) => {
    const path = new URL(request.url ?? '/', 'https://gateway.invalid').pathname;
    if (!['/gateway/graphql', '/graphql'].includes(path)) { socket.destroy(); return; }
    const origin = request.headers.origin;
    if (origin && !options.allowedOrigins.includes(origin)) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return;
    }
    wss.handleUpgrade(request, socket, head, ws => wss.emit('connection', ws, request));
  };
  server.on('upgrade', upgrade);
  wss.on('connection', socket => {
    let upstream: WebSocket | undefined;
    let token: string | undefined;
    let initializing = false;
    let principal: GatewayPrincipal | undefined;
    let heartbeatAlive = true;
    const initDeadline = setTimeout(() => socket.close(4408, 'Authentication timeout'), 5000);
    socket.on('pong', () => { heartbeatAlive = true; });
    const recheck = setInterval(() => {
      if (!heartbeatAlive) { socket.terminate(); return; }
      heartbeatAlive = false; socket.ping();
      if (token && principal) void authenticateChatSocket(token, options.authenticate).then(next => {
        if (JSON.stringify(next) !== JSON.stringify(principal)) socket.close(4401, 'Authentication changed');
      }).catch(() => socket.close(4401, 'Authentication expired'));
    }, options.recheckMs ?? 30000);
    recheck.unref(); initDeadline.unref();
    async function initializeConnection(message: { type?: unknown; payload?: { authorization?: unknown } }) {
      if (initializing || message.type !== 'connection_init') { socket.close(4401, 'Authentication required'); return; }
      initializing = true;
      const authorization = message.payload?.authorization;
      const match = typeof authorization === 'string' ? /^Bearer ([^\s]+)$/.exec(authorization) : null;
      if (!match) { socket.close(4401, 'Authentication required'); return; }
      token = match[1]; principal = await authenticateChatSocket(token, options.authenticate);
      if (socket.readyState !== WebSocket.OPEN) return;
      upstream = new WebSocket(upstreamUrl, 'graphql-transport-ws', { handshakeTimeout: 5000,
        maxPayload: 16 * 1024, headers: { 'x-gaegaeting-principal': createInternalAuthAssertion(principal, {
          secret: options.secret, issuer: 'gaegaeting-gateway', audience: 'chat', ttlSeconds: 30,
        }) } });
      upstream.on('open', () => upstream?.send(JSON.stringify({ type: 'connection_init' })));
      upstream.on('message', payload => {
        if (socket.readyState === WebSocket.OPEN) {
          if (socket.bufferedAmount > 128 * 1024) { socket.close(1013, 'Reconnect to resume'); return; }
          const event = JSON.parse(payload.toString());
          if (event.type === 'connection_ack') clearTimeout(initDeadline);
          socket.send(payload.toString());
        }
      });
      upstream.on('error', () => socket.close(1011, 'Chat connection unavailable'));
      upstream.on('close', (code) => socket.close(code >= 1000 && code < 5000 && ![1005,1006,1015].includes(code) ? code : 1011, 'Chat connection closed'));
    }
    socket.on('message', async bytes => {
      try {
        const message = JSON.parse(bytes.toString());
        if (!principal) {
          await initializeConnection(message);
          return;
        }
        if (!upstream || upstream.readyState !== WebSocket.OPEN) { socket.close(4401, 'Connection not ready'); return; }
        if (message.type === 'subscribe') {
          // Queries and mutations stay on the authenticated HTTP federation route.
          const operation = getOperationAST(parse(message.payload?.query ?? ''), message.payload?.operationName);
          if (operation?.operation !== 'subscription' || operation.selectionSet.selections.some(field =>
              field.kind !== 'Field' || field.name.value !== 'chatEvents')) {
            socket.close(4400, 'Only chat subscriptions are supported'); return;
          }
          const current = await authenticateChatSocket(token!, options.authenticate);
          message.payload.extensions = { internalAssertion: createInternalAuthAssertion(current, {
            secret: options.secret, issuer: 'gaegaeting-gateway', audience: 'chat', ttlSeconds: 30,
          }) };
        } else if (!['complete', 'ping', 'pong'].includes(message.type)) {
          socket.close(4400, 'Invalid subscription message'); return;
        }
        if (upstream.bufferedAmount > 128 * 1024) { socket.close(1013, 'Reconnect to resume'); return; }
        upstream.send(JSON.stringify(message));
      } catch (error) { socket.close(error instanceof Error && error.message === '503' ? 1013 : 4401, 'Authentication or subscription unavailable'); }
    });
    const stop = () => { clearTimeout(initDeadline); clearInterval(recheck); upstream?.terminate(); };
    socket.on('close', stop); socket.on('error', stop);
  });
  return async () => {
    server.off('upgrade', upgrade);
    for (const client of wss.clients) client.terminate();
    await new Promise<void>(resolve => wss.close(() => resolve()));
  };
}
