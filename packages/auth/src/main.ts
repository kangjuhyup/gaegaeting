import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ENV_KEY } from './common/config/env.config';
/**
 * 애플리케이션 부트스트랩
 */
async function bootstrap() {
  // NestJS 애플리케이션 생성
  const app = await NestFactory.create(AppModule);
  
  // 스웨거 설정
  const config = new DocumentBuilder()
    .setTitle('개개팅 API')
    .setDescription('강아지 산책 소개팅 애플리케이션 API 문서')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'JWT 토큰을 입력하세요',
        in: 'header',
      },
      'access-token',
    )
        .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'JWT 토큰을 입력하세요',
        in: 'header',
      },
      'admin-token',
    )
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'X-Tenant-ID' },
      'X-Tenant-ID',
    )
    .build();
  
  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
  });

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
   
  // 전역 파이프 설정 (유효성 검증)
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));
  
  // CORS 설정
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  
  // 환경 변수에서 포트 가져오기 (기본값: 3000)
  const configService = app.get(ConfigService);
  const port = configService.get(ENV_KEY.AUTH_SERVICE_API_PORT);
  
  // 서버 시작
  await app.listen(port);
  console.log(`애플리케이션이 http://localhost:${port} 에서 실행 중입니다.`);
}

// 애플리케이션 시작
bootstrap();
