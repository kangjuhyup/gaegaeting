import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * 애플리케이션 부트스트랩
 */
async function bootstrap() {
  // NestJS 애플리케이션 생성
  const app = await NestFactory.create(AppModule);
  
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
  const port = configService.get<number>('PORT', 3000);
  
  // 서버 시작
  await app.listen(port);
  console.log(`애플리케이션이 http://localhost:${port} 에서 실행 중입니다.`);
}

// 애플리케이션 시작
bootstrap();
