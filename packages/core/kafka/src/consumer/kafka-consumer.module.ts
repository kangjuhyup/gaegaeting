import { DynamicModule, Module, Provider } from '@nestjs/common';
import { SASLOptions } from 'kafkajs';
import { KafkaConsumerService } from './kafka-consumer.service';

export type KafkaMessageContext = {
  topic: string;
  partition: number;
  offset: string;
  key?: string;
  headers?: Record<string, string | undefined>;
};

export type KafkaMessageHandler<T = any> = (payload: T, ctx: KafkaMessageContext) => Promise<void> | void;

export type KafkaSubscription<T = any> = {
  topic: string;
  fromBeginning?: boolean;
  handler: KafkaMessageHandler<T>;
};

export interface KafkaConsumerModuleOptions {
  clientId: string;
  brokers: string[];
  groupId: string;
  ssl?: boolean;
  sasl?: SASLOptions;
  swallowHandlerError?: boolean;
  subscriptions: KafkaSubscription[];
}

export interface KafkaConsumerModuleAsyncOptions {
  imports?: any[];
  inject?: any[];
  useFactory: (...args: any[]) => KafkaConsumerModuleOptions | Promise<KafkaConsumerModuleOptions>;
}

@Module({})
export class KafkaConsumerModule {
  static forRoot(options: KafkaConsumerModuleOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: KafkaConsumerService,
        useFactory: () => new KafkaConsumerService(options),
      },
    ];

    return {
      module: KafkaConsumerModule,
      providers,
      exports: providers,
    };
  }

  static forRootAsync(options: KafkaConsumerModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: KafkaConsumerService,
        useFactory: async (...args: any[]) => new KafkaConsumerService(await options.useFactory(...args)),
        inject: options.inject ?? [],
      },
    ];

    return {
      module: KafkaConsumerModule,
      imports: options.imports ?? [],
      providers,
      exports: providers,
    };
  }
}


