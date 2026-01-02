import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule, DatabaseSchema } from '@core/database';
import { KafkaConsumerModule } from '@core/kafka';
import { HttpLoggerModule } from '@core/logger';
import { validationSchema } from '../config/env.config';
import { ItemApplicationModule } from './application/item.application.module';
import { AccountItemDeltaConsumer } from './infrastructure/adapter/inbound/kafka/account-item-delta.consumer';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    HttpLoggerModule.forRoot({
      name: 'Account-Item-Consumer',
      level: process.env.LOG_LEVEL || 'info',
    }),
    CqrsModule.forRoot({}),
    ItemApplicationModule,
    DatabaseModule.forRootAsync(
      {
        imports: [ConfigModule],
        inject: [ConfigService],
      },
      [DatabaseSchema.USER],
    ),
    KafkaConsumerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService, AccountItemDeltaConsumer],
      useFactory: (configService: ConfigService, consumer: AccountItemDeltaConsumer) => {
        const brokers = (configService.get<string>('KAFKA_BROKERS') ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        if (brokers.length === 0) {
          throw new Error('KAFKA_BROKERS is required (comma-separated).');
        }

        const ssl = (configService.get<string>('KAFKA_SSL') ?? '').toLowerCase() === 'true';
        const topic = configService.get<string>('KAFKA_ITEM_TOPIC') ?? 'account.item.delta.v1';

        return {
          clientId: configService.get<string>('KAFKA_CLIENT_ID') ?? 'account-consumer',
          brokers,
          groupId: configService.get<string>('KAFKA_GROUP_ID') ?? 'account-item-consumer',
          ssl,
          sasl: undefined,
          swallowHandlerError: true,
          subscriptions: [
            {
              topic,
              fromBeginning: false,
              handler: async (payload: any) => consumer.handle(payload),
            },
          ],
        };
      },
    }),
  ],
  providers: [AccountItemDeltaConsumer],
})
export class ItemConsumerModule {}


