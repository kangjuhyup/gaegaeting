import { MODULE_METADATA } from '@nestjs/common/constants';
import { ConfigService } from '@nestjs/config';
import { KafkaProducerService } from '@core/kafka';
import { LikeInfrastructureModule } from '@app/like/infrastructure/like.infrastructure.module';
import { ENV_KEY } from '@app/config/env.config';

describe('LikeInfrastructureModule (UNIT)', () => {
  it('KafkaProducerModule은 ConfigService.get(ENV_KEY.KAFKA_BROKERS)를 사용한다', async () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, LikeInfrastructureModule) as any[];
    expect(Array.isArray(imports)).toBe(true);

    const kafkaDynamicModule = imports.find(
      (m) => m?.providers && Array.isArray(m.providers),
    );
    expect(kafkaDynamicModule).toBeTruthy();

    const kafkaProducerProvider = (kafkaDynamicModule.providers as any[]).find(
      (p) => p?.provide === KafkaProducerService,
    );
    expect(kafkaProducerProvider).toBeTruthy();
    expect(typeof kafkaProducerProvider.useFactory).toBe('function');

    const brokers = ['broker-1:9092', 'broker-2:9092'];
    const configService = {
      get: jest.fn().mockReturnValue(brokers),
    } as unknown as ConfigService;

    const svc = await kafkaProducerProvider.useFactory(configService);

    expect((configService as any).get).toHaveBeenCalledWith(ENV_KEY.KAFKA_BROKERS);
    expect((svc as any).opts.clientId).toBe('like-service');
    expect((svc as any).opts.brokers).toEqual(brokers);
  });
});


