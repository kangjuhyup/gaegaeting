import { DynamicModule, Module, Provider } from "@nestjs/common";
import { SASLOptions } from "kafkajs";
import { KafkaProducerService } from "./kafka-producer.service";

export interface KafkaModuleOptions {
    clientId: string;
    brokers: string[];              
    ssl?: boolean;
    sasl?: SASLOptions;             
    allowAutoTopicCreation?: boolean;
    defaultHeaders?: Record<string, string>;
  }

export interface KafkaProducerModuleAsyncOptions {
    imports?: any[];
    inject?: any[];
    useFactory: (...args: any[]) => KafkaModuleOptions | Promise<KafkaModuleOptions>;
}
  

@Module({})
export class KafkaProducerModule {
    static forRoot(options: KafkaModuleOptions): DynamicModule {
    
        const providers : Provider[] = [
            {
                provide : KafkaProducerService,
                useFactory : () => new KafkaProducerService(options),
            }
        ]
        return {
          module: KafkaProducerModule,
          providers,
          exports: providers,
        };
      }

    static forRootAsync(options: KafkaProducerModuleAsyncOptions): DynamicModule {
        const providers: Provider[] = [
            {
                provide: KafkaProducerService,
                useFactory: async (...args: any[]) =>
                    new KafkaProducerService(await options.useFactory(...args)),
                inject: options.inject ?? [],
            },
        ];

        return {
            module: KafkaProducerModule,
            imports: options.imports ?? [],
            providers,
            exports: providers,
        };
    }
}