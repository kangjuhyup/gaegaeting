import { NestFactory } from '@nestjs/core';
import { ItemConsumerModule } from './item/item.consumer.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(ItemConsumerModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  app.enableShutdownHooks();
}

void bootstrap();


