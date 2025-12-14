import express from 'express';
import { json } from 'body-parser';
import { expressMiddleware } from '@as-integrations/express5';
import { Gateway } from './gateway';
import { config } from 'dotenv';

// 환경 변수 로드
config();

const PORT = parseInt(process.env.GATEWAY_PORT || '4000', 10);

async function bootstrap() {
  const app = express();

  // CORS 설정
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    );
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-ID');
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
  const gateway = new Gateway();
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
      headers: req.headers,
    }),
  });

  // prefixed (prod ingress)
  app.all('/gateway/graphql', json(), gqlMiddleware);
  // backward-compatible (local/dev)
  app.all('/graphql', json(), gqlMiddleware);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down gracefully...');
    await gateway.shutdown();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // 서버 시작
  app.listen(PORT, () => {
    console.log(
      `🚀 Apollo Federation Gateway: http://localhost:${PORT}/gateway/graphql`,
    );
    console.log(`🧪 Apollo Sandbox: http://localhost:${PORT}/gateway/graphql`);
    console.log(`❤️  Health: http://localhost:${PORT}/gateway/health`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start gateway:', error);
  process.exit(1);
});
