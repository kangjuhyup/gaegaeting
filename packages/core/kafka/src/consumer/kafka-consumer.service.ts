import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Consumer, Kafka } from 'kafkajs';
import {
  KafkaConsumerModuleOptions,
  KafkaMessageContext,
  KafkaSubscription,
} from './kafka-consumer.module';

export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private consumer?: Consumer;
  private readonly subsByTopic = new Map<string, KafkaSubscription[]>();

  constructor(private readonly opts: KafkaConsumerModuleOptions) {
    for (const s of opts.subscriptions ?? []) {
      const arr = this.subsByTopic.get(s.topic) ?? [];
      arr.push(s);
      this.subsByTopic.set(s.topic, arr);
    }
  }

  async onModuleInit(): Promise<void> {
    const kafka = new Kafka({
      clientId: this.opts.clientId,
      brokers: this.opts.brokers,
      ssl: this.opts.ssl ? true : undefined,
      sasl: this.opts.sasl,
    });

    const consumer = kafka.consumer({ groupId: this.opts.groupId });
    await consumer.connect();

    for (const [topic, subs] of this.subsByTopic.entries()) {
      const fromBeginning = subs.some((s) => s.fromBeginning);
      await consumer.subscribe({ topic, fromBeginning });
    }

    await consumer.run({
      autoCommit: true,
      eachMessage: async ({ topic, partition, message }) => {
        const handlers = this.subsByTopic.get(topic);
        if (!handlers || handlers.length === 0) return;

        const raw = message.value?.toString('utf8');
        if (!raw) return;

        let payload: any;
        try {
          payload = JSON.parse(raw);
        } catch (e: any) {
          this.logger.error(`invalid json topic=${topic} offset=${message.offset}: ${e?.message}`);
          return;
        }

        const ctx: KafkaMessageContext = {
          topic,
          partition,
          offset: message.offset,
          key: message.key?.toString('utf8'),
          headers: message.headers
            ? Object.fromEntries(
                Object.entries(message.headers).map(([k, v]) => [k, v?.toString('utf8')]),
              )
            : undefined,
        };

        for (const sub of handlers) {
          try {
            await sub.handler(payload, ctx);
          } catch (e: any) {
            if (this.opts.swallowHandlerError ?? true) {
              this.logger.error(`handler error topic=${topic} offset=${message.offset}: ${e?.message}`);
              continue;
            }
            throw e;
          }
        }
      },
    });

    this.consumer = consumer;
    this.logger.log(
      `Kafka consumer started. groupId=${this.opts.groupId} topics=[${[...this.subsByTopic.keys()].join(
        ', ',
      )}]`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.consumer?.disconnect();
    } catch (e: any) {
      this.logger.warn(`consumer disconnect failed: ${e?.message}`);
    }
  }
}


