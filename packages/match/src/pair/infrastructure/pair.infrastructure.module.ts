import { Module, Provider } from "@nestjs/common";
import { PairController } from "./adapter/inbound/http/pair.controller";
import { PairOrmRepository } from "./adapter/outbound/persistence/pair.orm.repository";
import { PairRepositoryPort } from "../domain/port/pair.repository.port";
import { PairOrmMapper } from "./adapter/outbound/persistence/mapper/pair-orm.mapper";
import { KafkaProducerPort } from "../domain/port/kafka-producer.port";
import { KafkaProducerAdapter } from "./adapter/outbound/event/kafka-producer.adapter";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { KafkaProducerModule } from "@core/kafka";
import { ENV_KEY } from "@app/config/env.config";
import { ConfigModule, ConfigService } from "@nestjs/config";

const providers : Provider[] = [
    PairOrmMapper,
    { provide : PairRepositoryPort, useClass : PairOrmRepository },
    { provide : KafkaProducerPort, useClass : KafkaProducerAdapter },
]

@Module({
    imports : [
        EventEmitterModule.forRoot(),
        KafkaProducerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                return {
                    clientId: "pair-service",
                    brokers: configService.get<string[]>(ENV_KEY.KAFKA_BROKERS),
                    ssl: false,
                    sasl: undefined,
                    allowAutoTopicCreation: true,
                    defaultHeaders: {
                        'Content-Type': 'application/json',
                    },
                };
            },
        }),
    ],
    ],
    controllers: [
        PairController
    ],
    providers,
    exports : providers
})
export class PairInfrastructureModule {}