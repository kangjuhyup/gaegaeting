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
  

@Module({})
export class KafkaProducerModule {
    static forRoot(options: KafkaModuleOptions): DynamicModule {
    
        const providers : Provider[] = [
            {
                provide : KafkaProducerService,
                useFactory : (options : KafkaModuleOptions) => new KafkaProducerService(options),
            }
        ]
        return {
          module: KafkaProducerModule,
          providers,
          exports: providers,
        };
      }
}