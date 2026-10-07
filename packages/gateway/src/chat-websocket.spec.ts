import { createServer, type Server } from "node:http";
import { once } from "node:events";
import { WebSocket, WebSocketServer } from "ws";
import { verifyInternalAuthAssertion } from "@core/auth-assertion";
import { AccountSubjectClient } from "./auth/account-subject-client.js";
import { createAuthenticationMiddleware } from "./auth/authentication-middleware.js";
import { OpaqueTokenIntrospector } from "./auth/introspection-client.js";
import { startChatWebsocket } from "./chat-websocket.js";

const issuer = "https://auth.example/t/gaegaeting-dev/oidc";
const tenantId = "11111111-2222-4333-8444-555555555555";
const userId = "01J00000000000000000000000";
const secret = "gateway-chat-regression-internal-secret";
const audience = "https://api.example";

async function listen(server: Server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return `http://127.0.0.1:${(server.address() as import("node:net").AddressInfo).port}`;
}

async function close(server: Server) {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

function message(socket: WebSocket): Promise<any> {
  return new Promise((resolve, reject) => {
    const received = (bytes: Buffer) => {
      socket.off("close", closed);
      resolve(JSON.parse(bytes.toString()));
    };
    const closed = (code: number) => {
      socket.off("message", received);
      reject(new Error(`Socket closed ${code}`));
    };
    socket.once("message", received);
    socket.once("close", closed);
  });
}

describe("native Chat WebSocket authentication", () => {
  let authServer: Server;
  let gatewayServer: Server;
  let chatServer: Server;
  let chatSockets: WebSocketServer;
  let stopGateway: () => Promise<void>;
  let gatewayUrl: string;
  let mappingRequests: unknown[];
  let upstreamHeaders: import("node:http").IncomingHttpHeaders[];
  let upstreamPrincipals: unknown[];
  let subscriptionPrincipals: unknown[];

  beforeEach(async () => {
    mappingRequests = [];
    upstreamHeaders = [];
    upstreamPrincipals = [];
    subscriptionPrincipals = [];
    authServer = createServer(async (request, response) => {
      let raw = "";
      for await (const chunk of request) raw += chunk;
      response.setHeader("content-type", "application/json");
      if (request.url === "/introspect") {
        const token = new URLSearchParams(raw).get("token");
        if (token === "unavailable") {
          response.writeHead(503).end("{}");
          return;
        }
        response.end(
          JSON.stringify({
            active: token !== "inactive",
            iss: token === "foreign" ? "https://foreign.example/oidc" : issuer,
            aud: audience,
            tenant_id: tenantId,
            sub: token === "unlinked" ? "unlinked-subject" : "linked-subject",
            scope: "chat:read match:read",
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 300,
          }),
        );
        return;
      }
      const input = JSON.parse(raw);
      mappingRequests.push(input);
      // Account mappings use issuer + subject; Auth's tenant UUID remains a principal claim.
      if (input.tenant_id !== issuer || input.sub !== "linked-subject") {
        response.writeHead(404).end("{}");
        return;
      }
      response.end(JSON.stringify({ user_id: userId }));
    });
    const authUrl = await listen(authServer);
    const introspector = new OpaqueTokenIntrospector(
      {
        get: async () => ({
          issuer,
          introspectionEndpoint: `${authUrl}/introspect`,
        }),
      },
      fetch,
      {
        clientId: "test-client",
        clientSecret: "synthetic-test-secret",
        expectedIssuer: issuer,
        expectedAudience: audience,
        timeoutMs: 2000,
      },
    );
    const subjects = new AccountSubjectClient(`${authUrl}/resolve`);
    chatServer = createServer();
    chatSockets = new WebSocketServer({ server: chatServer });
    chatSockets.on("connection", (socket, request) => {
      upstreamHeaders.push(request.headers);
      upstreamPrincipals.push(
        verifyInternalAuthAssertion(
          request.headers["x-gaegaeting-principal"] as string,
          { secret, issuer: "gaegaeting-gateway", audience: "chat" },
        ),
      );
      socket.on("message", (bytes) => {
        const value = JSON.parse(bytes.toString());
        if (value.type === "connection_init")
          socket.send(JSON.stringify({ type: "connection_ack" }));
        if (value.type === "subscribe") {
          subscriptionPrincipals.push(
            verifyInternalAuthAssertion(
              value.payload.extensions.internalAssertion,
              { secret, issuer: "gaegaeting-gateway", audience: "chat" },
            ),
          );
          socket.send(
            JSON.stringify({
              id: value.id,
              type: "next",
              payload: { data: { chatEvents: { kind: "ready" } } },
            }),
          );
        }
      });
    });
    const chatUrl = await listen(chatServer);
    gatewayServer = createServer();
    stopGateway = startChatWebsocket(gatewayServer, {
      serviceUrl: `${chatUrl}/chat/graphql`,
      secret,
      authenticate: createAuthenticationMiddleware(introspector, subjects),
      allowedOrigins: [],
      recheckMs: 60000,
    });
    gatewayUrl =
      (await listen(gatewayServer)).replace("http:", "ws:") +
      "/gateway/graphql";
  });

  afterEach(async () => {
    await stopGateway();
    for (const socket of chatSockets.clients) socket.terminate();
    await new Promise<void>((resolve) => chatSockets.close(() => resolve()));
    await close(gatewayServer);
    await close(chatServer);
    await close(authServer);
  });

  test("a linked native user receives an acknowledgement and protected events when issuer differs from tenant UUID", async () => {
    const socket = new WebSocket(gatewayUrl, "graphql-transport-ws");
    await once(socket, "open");
    const ack = message(socket);
    socket.send(
      JSON.stringify({
        type: "connection_init",
        payload: { authorization: "Bearer native-opaque" },
      }),
    );
    expect(await ack).toEqual({ type: "connection_ack" });
    const event = message(socket);
    socket.send(
      JSON.stringify({
        id: "events",
        type: "subscribe",
        payload: { query: "subscription { chatEvents { kind } }" },
      }),
    );
    expect(await event).toEqual({
      id: "events",
      type: "next",
      payload: { data: { chatEvents: { kind: "ready" } } },
    });
    expect(mappingRequests).toEqual([
      { tenant_id: issuer, sub: "linked-subject" },
      { tenant_id: issuer, sub: "linked-subject" },
    ]);
    for (const principal of [
      ...upstreamPrincipals,
      ...subscriptionPrincipals,
    ]) {
      expect(principal).toMatchObject({
        tenantId,
        subject: "linked-subject",
        userId,
        scopes: ["chat:read", "match:read"],
      });
    }
    expect(upstreamHeaders[0].authorization).toBeUndefined();
    expect(upstreamHeaders[0]["x-jwt-payload"]).toBeUndefined();
    const closed = once(socket, "close");
    socket.close();
    await closed;
  });

  test.each([
    ["inactive", 4401, false],
    ["foreign", 4401, false],
    ["unlinked", 4401, true],
    ["unavailable", 1013, false],
  ])(
    "%s authentication fails closed before a Chat connection is opened",
    async (token, code, lookup) => {
      const socket = new WebSocket(gatewayUrl, "graphql-transport-ws");
      const closed = once(socket, "close");
      await once(socket, "open");
      socket.send(
        JSON.stringify({
          type: "connection_init",
          payload: { authorization: `Bearer ${token}` },
        }),
      );
      const [actualCode] = await closed;
      expect(actualCode).toBe(code);
      expect(mappingRequests.length).toBe(lookup ? 1 : 0);
      expect(upstreamHeaders).toHaveLength(0);
    },
  );
});
