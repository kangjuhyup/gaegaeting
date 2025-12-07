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
  console.log('[1/5] Creating NestJS application...');
  const app = await NestFactory.create(AppModule, {
    bufferLogs: false, // 로그 버퍼링 비활성화하여 즉시 출력
  });
  console.log('[2/5] NestJS application created');

  // 앱 초기화 (lifecycle hooks 실행 보장)
  console.log('[3/5] Initializing application (calling app.init())...');
  console.log('This will trigger onModuleInit() hooks...');
  
  try {
    await app.init();
    console.log('[4/5] Application initialized successfully');
  } catch (error) {
    console.error('[ERROR] Failed to initialize application:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }

  console.log('Application initialized, getting GatewayService...');
  // Gateway Service 가져오기
  const gatewayService = app.get(GatewayService);
  
  console.log('Waiting for gateway server to be initialized...');
  // 서버가 초기화될 때까지 대기
  // onModuleInit()이 비동기로 실행되므로 잠시 대기
  let server = gatewayService.getServer();
  const maxWaitTime = 60000; // 60초로 증가 (서브그래프 연결 시간 고려)
  const checkInterval = 500; // 500ms마다 확인
  let elapsed = 0;
  
  while (!server && elapsed < maxWaitTime) {
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
    server = gatewayService.getServer();
    elapsed += checkInterval;
    
    if (elapsed % 5000 === 0) {
      console.log(`Still waiting for gateway server... (${elapsed / 1000}s elapsed)`);
    }
  }

  if (!server) {
    console.error('Gateway server initialization timeout!');
    throw new Error('Gateway server is not initialized after 60 seconds');
  }

  console.log('Gateway server initialized successfully!');

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

