import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { pathToFileURL } from 'node:url';
import { AppModule } from './app.module.js';

export async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.setGlobalPrefix('chat');
  const config = app.get(ConfigService);
  await app.listen(config.getOrThrow<number>('CHAT_SERVICE_API_PORT'));
  return app;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void bootstrap().catch(() => { console.error('Chat service startup failed'); process.exitCode = 1; });
}
