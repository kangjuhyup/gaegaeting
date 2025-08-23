import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer, ProducerRecord, logLevel } from 'kafkajs';
import { KafkaModuleOptions } from './kafka-producer.module';

interface KafkaMessage {
    key?: string | Buffer;
    value: Buffer | string;         // string이면 내부에서 Buffer 변환 가능
    headers?: Record<string, string | Buffer | null>;
    partition?: number;
}

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka!: Kafka;
  private producer!: Producer;
  private connected = false;

  constructor(private readonly opts: KafkaModuleOptions) {
    this.kafka = new Kafka({
      clientId: opts.clientId,
      brokers: opts.brokers,
      ssl: opts.ssl,
      sasl: opts.sasl as any,
      logLevel: logLevel.NOTHING,
    });
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: !!opts.allowAutoTopicCreation,
    });
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect().catch(() => void 0);
  }

  async connect() {
    if (this.connected) return;
    await this.producer.connect();
    this.connected = true;
    this.logger.log(`Kafka producer connected (clientId=${this.opts.clientId})`);
  }

  async disconnect() {
    if (!this.connected) return;
    await this.producer.disconnect();
    this.connected = false;
    this.logger.log('Kafka producer disconnected');
  }

  /**
   * 단건/소량 전송
   */
  async send(topic: string, messages: KafkaMessage[], acks: 0 | 1 | -1 = -1) {
    const record: ProducerRecord = {
      topic,
      acks,
      messages: messages.map(m => ({
        key: m.key,
        value: typeof m.value === 'string' ? Buffer.from(m.value) : m.value,
        headers: this.mergeHeaders(m.headers),
        partition: m.partition,
      })),
    };
    return this.producer.send(record);
  }

  /**
   * 대량 배치 전송
   */
  async sendBatch(batch: Array<{ topic: string; messages: KafkaMessage[] }>, acks: 0 | 1 | -1 = -1) {
    return this.producer.sendBatch({
      topicMessages: batch.map(b => ({
        topic: b.topic,
        messages: b.messages.map(m => ({
          key: m.key,
          value: typeof m.value === 'string' ? Buffer.from(m.value) : m.value,
          headers: this.mergeHeaders(m.headers),
          partition: m.partition,
        })),
      })),
      acks,
    });
  }

  private mergeHeaders(h?: Record<string, string | Buffer | null>) {
    const base = this.opts.defaultHeaders ?? {};
    const result: Record<string, Buffer | string | null> = {};
    const merged = { ...base, ...h };

    for (const [k, v] of Object.entries(merged)) {
      if (v == null) { result[k] = null; continue; }
      result[k] = typeof v === 'string' ? Buffer.from(v) : v;
    }
    return result;
  }
}
