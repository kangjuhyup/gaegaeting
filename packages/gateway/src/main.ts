import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ENV_KEY } from './config/env.config';
import { GatewayService } from './gateway/gateway.service';
import { expressMiddleware } from '@as-integrations/express5';
import { json } from 'body-parser';

/**
 * 애플리케이션 부트스트랩
 */
async function bootstrap() {
  // NestJS 애플리케이션 생성
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Gateway Service 가져오기
  const gatewayService = app.get(GatewayService);
  
  // 서버가 초기화될 때까지 대기
  // onModuleInit()이 비동기로 실행되므로 잠시 대기
  let server = gatewayService.getServer();
  const maxWaitTime = 30000; // 30초
  const checkInterval = 100; // 100ms마다 확인
  let elapsed = 0;
  
  while (!server && elapsed < maxWaitTime) {
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
    server = gatewayService.getServer();
    elapsed += checkInterval;
  }

  if (!server) {
    throw new Error('Gateway server is not initialized after 30 seconds');
  }

  // CORS 설정
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // GraphQL 엔드포인트 설정
  app.use(
    '/graphql',
    json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        // 요청 컨텍스트에 헤더 정보 전달
        return {
          headers: req.headers,
          tenant: req.headers['x-tenant-id'] as string | undefined,
        };
      },
    }),
  );

  // 환경 변수에서 포트 가져오기
  const configService = app.get(ConfigService);
  const port = configService.get<number>(ENV_KEY.GATEWAY_PORT) || 4000;

  // 서버 시작
  await app.listen(port);
  console.log(`🚀 Apollo Federation Gateway가 http://localhost:${port} 에서 실행 중입니다.`);
  console.log(`📊 GraphQL Playground: http://localhost:${port}/graphql`);
}

// 애플리케이션 시작
bootstrap();

