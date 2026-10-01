import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KafkaProducerService } from '@core/kafka';
import { ENV_KEY } from '#app/config/env.config';
import { type TopicPayloadMap, Topics } from './topic.js';

/** Shared outbound transport for Feed, Like and Pair Kafka events. */
@Injectable()
export class KafkaProducerAdapter {
  constructor(
    private readonly kafkaProducer: KafkaProducerService,
    private readonly configService: ConfigService,
  ) {}

  async produce<T extends Topics>(topic: T, payload: TopicPayloadMap[T]): Promise<void> {
    const prefix = this.configService.get<string>(ENV_KEY.KAFKA_TOPIC_PREFIX) ?? '';
    await this.kafkaProducer.send(prefix ? `${prefix}.${topic}` : topic, [
      { value: JSON.stringify(payload) },
    ]);
  }
}
