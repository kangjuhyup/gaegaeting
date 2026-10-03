import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, type Consumer, logLevel } from 'kafkajs';
import { RoomService } from '../../application/service/room.service.js';

@Injectable()
export class PairEventsConsumer implements OnModuleInit, OnModuleDestroy {
  private consumer?: Consumer;
  private readonly logger = new Logger(PairEventsConsumer.name);
  constructor(private readonly config: ConfigService, private readonly chat: RoomService) {}
  async onModuleInit() {
    if (!this.config.get<boolean>('CHAT_KAFKA_ENABLED')) return;
    this.consumer = new Kafka({ clientId: 'gaegaeting-chat',
      brokers: this.config.getOrThrow<string[]>('KAFKA_BROKERS'), logLevel: logLevel.NOTHING,
    }).consumer({ groupId: this.config.getOrThrow<string>('CHAT_KAFKA_GROUP_ID') });
    await this.consumer.connect();
    const prefix = this.config.get<string>('KAFKA_TOPIC_PREFIX', '');
    await this.consumer.subscribe({ topic: `${prefix ? `${prefix}.` : ''}chat.room.created.v1`, fromBeginning: true });
    await this.consumer.run({ eachMessage: async ({ message }) => {
      if (!message.value) throw new Error('Missing pair event');
      const payload = JSON.parse(message.value.toString('utf8'));
      // Replay events serialized by the previous Match payload class as well.
      await this.chat.createPairRoom({ pairId: payload?.pairId ?? payload?._pairId,
        leftUserId: payload?.leftUserId ?? payload?._leftUserId,
        rightUserId: payload?.rightUserId ?? payload?._rightUserId });
    } });
    this.logger.log('매칭 채팅방 이벤트 소비 시작');
  }
  async onModuleDestroy() { await this.consumer?.disconnect(); }
}
