import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../app.module';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Swagger 스펙 JSON 파일 생성 스크립트
 * 사용법: yarn workspace auth swagger:generate
 */
async function generateSwaggerSpec() {
  // NestJS 애플리케이션 생성 (서버 시작 없이)
  const app = await NestFactory.create(AppModule, {
    logger: false, // 로그 비활성화
  });

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

  // 출력 디렉토리 생성
  const outputDir = path.join(process.cwd(), '../../docs/auth');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Swagger 스펙 JSON 파일 생성
  const outputPath = path.join(outputDir, 'swagger-spec.json');
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));

  console.log(`✅ Swagger spec이 생성되었습니다: ${outputPath}`);

  // 애플리케이션 종료
  await app.close();
}

// 스크립트 실행
generateSwaggerSpec()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Swagger spec 생성 실패:', error);
    process.exit(1);
  });

