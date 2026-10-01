import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { createEdgeAssertion, EDGE_ASSERTION_HEADER } from '../auth/edge-assertion.js';
import {
  InactiveTokenError,
  type OpaqueTokenIntrospector,
} from '../auth/introspection-client.js';

type Introspector = Pick<OpaqueTokenIntrospector, 'introspect'>;

export function createEdgeAuthzServer(introspector: Introspector, secret: string): Server {
  if (secret.length < 32) throw new Error('EDGE_AUTH_ASSERTION_SECRET must contain at least 32 characters');
  return createServer((request, response) => {
    void authorize(request, response, introspector, secret);
  });
}

async function authorize(
  request: IncomingMessage,
  response: ServerResponse,
  introspector: Introspector,
  secret: string,
): Promise<void> {
  response.setHeader('Cache-Control', 'no-store');
  if (request.url === '/health' && request.method === 'GET') {
    response.writeHead(200).end('ok');
    return;
  }
  if (request.url?.split('?')[0] !== '/gateway/graphql') {
    response.writeHead(404).end();
    return;
  }
  if (request.method === 'OPTIONS') {
    response.writeHead(200).end();
    return;
  }
  if (request.method !== 'POST') {
    response.writeHead(405).end();
    return;
  }
  const authorization = request.headers.authorization;
  const bearer = typeof authorization === 'string' ? /^Bearer ([^\s]+)$/.exec(authorization) : null;
  if (!bearer) {
    response.writeHead(401).end();
    return;
  }
  try {
    const principal = await introspector.introspect(bearer[1]);
    response.setHeader(EDGE_ASSERTION_HEADER, createEdgeAssertion(principal, bearer[1], secret));
    response.writeHead(200).end();
  } catch (error) {
    response.writeHead(error instanceof InactiveTokenError ? 401 : 503).end();
  }
}
