import { describe, expect, it, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import type { KafkaProducerService } from '@core/kafka';
import { envSpec } from '#app/config/env.config';
import { Topics, type TopicPayloadMap } from './topic.js';
import { KafkaProducerAdapter as FeedProducer } from '#app/feed/infrastructure/adapter/outbound/event/kafka-producer.adapter';
import { KafkaProducerAdapter as LikeProducer } from '#app/like/infrastructure/adapter/outbound/event/kafka-producer.adapter';
import { KafkaProducerAdapter as PairProducer } from '#app/pair/infrastructure/adapter/outbound/event/kafka-producer.adapter';

describe.each([
  ['Feed', FeedProducer], ['Like', LikeProducer], ['Pair', PairProducer],
] as const)('%s Kafka environment isolation', (_name, Producer) => {
  it.each(Object.values(Topics))('publishes %s exclusively to the configured dev namespace', async (topic) => {
    const send = jest.fn(async () => undefined);
    const producer = new Producer({ send } as unknown as KafkaProducerService,
      new ConfigService({ KAFKA_TOPIC_PREFIX: 'dev.gaegaeting' }));
    const payload = { userId: 'qa-user', eventId: 'qa-event' } as unknown as TopicPayloadMap[typeof topic];
    await producer.produce(topic, payload);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(`dev.gaegaeting.${topic}`, [{ value: JSON.stringify(payload) }]);
  });

  it('uses a separate production namespace without changing the payload', async () => {
    const send = jest.fn(async () => undefined);
    const producer = new Producer({ send } as unknown as KafkaProducerService,
      new ConfigService({ KAFKA_TOPIC_PREFIX: 'prd.gaegaeting' }));
    await producer.produce(Topics.CHAT_ROOM_CREATED_V1, { pairId: 'qa-pair' });
    expect(send).toHaveBeenCalledWith('prd.gaegaeting.chat.room.created.v1', [{ value: JSON.stringify({ pairId: 'qa-pair' }) }]);
  });

  it.each([undefined, ''])('preserves legacy topics when prefix is %s', async (prefix) => {
    const send = jest.fn(async () => undefined);
    const producer = new Producer({ send } as unknown as KafkaProducerService,
      new ConfigService({ KAFKA_TOPIC_PREFIX: prefix }));
    await producer.produce(Topics.CHAT_ROOM_CREATED_V1, { pairId: 'qa-pair' });
    expect(send).toHaveBeenCalledWith(Topics.CHAT_ROOM_CREATED_V1, [{ value: JSON.stringify({ pairId: 'qa-pair' }) }]);
  });

  it('propagates broker failures instead of reporting delivery success', async () => {
    const send = jest.fn(async () => { throw new Error('broker unavailable'); });
    const producer = new Producer({ send } as unknown as KafkaProducerService,
      new ConfigService({ KAFKA_TOPIC_PREFIX: 'dev.gaegaeting' }));
    await expect(producer.produce(Topics.CHAT_ROOM_CREATED_V1, {})).rejects.toThrow('broker unavailable');
  });
});

describe('Kafka topic prefix configuration', () => {
  it.each(['dev.gaegaeting', 'prd.gaegaeting', 'test_ggt-1', 'a'.repeat(200), ''])('accepts %s', (prefix) => {
    expect(envSpec.KAFKA_TOPIC_PREFIX.joi.validate(prefix).error).toBeUndefined();
  });
  it('defaults to legacy topics for existing installations', () => {
    expect(envSpec.KAFKA_TOPIC_PREFIX.joi.validate(undefined).value).toBe('');
  });
  it.each(['.', '..', 'dev/gaegaeting', 'dev gaegaeting', ' dev.gaegaeting', 'a'.repeat(201)])('rejects invalid prefix %s at startup', (prefix) => {
    expect(envSpec.KAFKA_TOPIC_PREFIX.joi.validate(prefix).error).toBeDefined();
  });
});
