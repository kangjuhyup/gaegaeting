import { MODULE_METADATA } from '@nestjs/common/constants';
import { ConfigService } from '@nestjs/config';
import { LikeInfrastructureModule } from '@app/like/infrastructure/like.infrastructure.module';
import { ENV_KEY } from '@app/config/env.config';

// Avoid pulling @core/kafka real module graph in unit tests (Yarn PnP + Nest peer resolution).
// We only need to inspect the factory used in forRootAsync.
jest.mock('@core/kafka', () => {
  return {
    KafkaProducerModule: {
      forRootAsync: (opts: any) => {
        return {
          module: class MockKafkaProducerModule {},
          imports: opts.imports ?? [],
          providers: [
            {
              provide: 'KAFKA_PRODUCER_SERVICE_FACTORY',
              useFactory: opts.useFactory,
              inject: opts.inject ?? [],
            },
          ],
          exports: [],
        };
      },
    },
  };
});

describe('LikeInfrastructureModule (UNIT)', () => {
  it('KafkaProducerModule은 ConfigService.get(ENV_KEY.KAFKA_BROKERS)를 사용한다', async () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, LikeInfrastructureModule) as any[];
    expect(Array.isArray(imports)).toBe(true);

    const kafkaDynamicModule = imports.find(
      (m) => m?.providers && Array.isArray(m.providers),
    );
    expect(kafkaDynamicModule).toBeTruthy();

    const kafkaProducerProvider = (kafkaDynamicModule.providers as any[]).find(
      (p) => p?.provide === 'KAFKA_PRODUCER_SERVICE_FACTORY',
    );
    expect(kafkaProducerProvider).toBeTruthy();
    expect(typeof kafkaProducerProvider.useFactory).toBe('function');

    const brokers = ['broker-1:9092', 'broker-2:9092'];
    const configService = {
      get: jest.fn().mockReturnValue(brokers),
    } as unknown as ConfigService;

    const opts = await kafkaProducerProvider.useFactory(configService);

    expect((configService as any).get).toHaveBeenCalledWith(ENV_KEY.KAFKA_BROKERS);
    expect(opts.clientId).toBe('like-service');
    expect(opts.brokers).toEqual(brokers);
  });
});


