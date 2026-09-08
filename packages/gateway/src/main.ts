import express from 'express';
import type { Server } from 'node:http';
import bodyParser from 'body-parser';
import { expressMiddleware } from '@as-integrations/express5';
import { Gateway } from './gateway.js';
import { config } from 'dotenv';
import { OidcDiscoveryCache } from './auth/oidc-discovery.js';
import { OpaqueTokenIntrospector } from './auth/introspection-client.js';
import { AccountSubjectClient } from './auth/account-subject-client.js';
import { createAuthenticationMiddleware } from './auth/authentication-middleware.js';
import { resolveOidcRuntimeConfig } from './auth/oidc-runtime-config.js';
import { pathToFileURL } from 'node:url';

const { json } = bodyParser;

// 환경 변수 로드
config();

const PORT = parseInt(process.env.GATEWAY_PORT || '4000', 10);
const API_AUDIENCE = 'https://api.gaegaeting.app';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Required environment variable is missing: ${name}`);
  return value;
}

export async function bootstrap(): Promise<{
  app: express.Express;
  gateway: Gateway;
  httpServer: Server;
  shutdown: () => Promise<void>;
}> {
  const app = express();

  // CORS 설정
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    );
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check (k8s liveness/readiness)
  app.get('/gateway/health', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  // Gateway 초기화
  const assertionSecret = requireEnv('INTERNAL_AUTH_ASSERTION_SECRET');
  const oidc = resolveOidcRuntimeConfig(process.env);
  const discovery = new OidcDiscoveryCache(
    oidc.discoveryUrl,
    oidc.issuer,
    fetch,
    {
      allowInsecureLoopbackHttp: oidc.allowInsecureLoopbackHttp,
      allowedInsecureHttpHosts: oidc.insecureHttpAllowedHosts,
    },
  );
  const introspector = new OpaqueTokenIntrospector(discovery, fetch, {
    clientId: process.env.OIDC_INTROSPECTION_CLIENT_ID ?? 'gaegaeting-api',
    clientSecret: requireEnv('OIDC_INTROSPECTION_CLIENT_SECRET'),
    expectedIssuer: oidc.issuer,
    expectedAudience: API_AUDIENCE,
    timeoutMs: Number(process.env.OIDC_INTROSPECTION_TIMEOUT_MS ?? 2_000),
  });
  const subjects = new AccountSubjectClient(
    process.env.ACCOUNT_SUBJECT_RESOLUTION_URL ??
      'http://account.app.svc.cluster.local:2800/account/internal/subjects/resolve',
  );
  const authenticate = createAuthenticationMiddleware(introspector, subjects);

  const gateway = new Gateway(assertionSecret);
  await gateway.initialize();

  const server = gateway.getServer();
  if (!server) {
    throw new Error('Gateway server is not initialized');
  }

  // /gateway/graphql 엔드포인트에 Apollo Server 연결
  // 모든 HTTP 메서드에 대해 GraphQL 엔드포인트 등록
  // json() 미들웨어를 먼저 적용하여 req.body를 파싱
  const gqlMiddleware = expressMiddleware(server, {
    context: async ({ req }) => ({
      authenticatedPrincipal: (req as any).authenticatedPrincipal,
    }),
  });

  // prefixed (prod ingress)
  app.all('/gateway/graphql', json(), authenticate, gqlMiddleware);
  // backward-compatible (local/dev)
  app.all('/graphql', json(), authenticate, gqlMiddleware);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down gracefully...');
    await gateway.shutdown();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // 서버 시작
  const httpServer = app.listen(PORT, () => {
    console.log(
      `🚀 Apollo Federation Gateway: http://localhost:${PORT}/gateway/graphql`,
    );
    console.log(`🧪 Apollo Sandbox: http://localhost:${PORT}/gateway/graphql`);
    console.log(`❤️  Health: http://localhost:${PORT}/gateway/health`);
  });

  return { app, gateway, httpServer, shutdown };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void bootstrap().catch((error: unknown) => {
    console.error('Failed to start gateway:', error);
    process.exitCode = 1;
  });
}
