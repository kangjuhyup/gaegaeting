import { Module, type Provider } from "@nestjs/common";
import { LikeController } from "./adapter/inbound/http/like.controller.js";
import { LikeRepositoryPort } from "../domain/port/like.repository.port.js";
import { LikeOrmRepository } from "./adapter/outbound/persistence/like.orm.repository.js";
import { LikeOrmMapper } from "./adapter/outbound/persistence/mapper/like-orm.mapper.js";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { KafkaProducerModule } from "@core/kafka";
import { KafkaProducerPort } from "../domain/port/kafka-producer.port.js";
import { KafkaProducerAdapter } from "./adapter/outbound/event/kafka-producer.adapter.js";
import { EventPublisherPort } from "../domain/port/event-publisher.port.js";
import { EventPublisherAdapter } from "./adapter/outbound/event/event-publisher.adapter.js";
import { LikeEventHandler } from "./adapter/inbound/event/like.handler.js";
import { ENV_KEY } from "#app/config/env.config";
import { ConfigModule, ConfigService } from "@nestjs/config";


const providers : Provider[] = [
    LikeOrmMapper,
    {
        provide : LikeRepositoryPort,
        useClass : LikeOrmRepository
    },
    {
        provide : KafkaProducerPort,
        useClass : KafkaProducerAdapter
    },
    {
        provide : EventPublisherPort,
        useClass : EventPublisherAdapter
    },
    LikeEventHandler
]

@Module({
    imports : [
        KafkaProducerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                return {
                    clientId: "like-service",
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
    controllers: [
        LikeController,
    ],
    providers,
    exports : providers
})
export class LikeInfrastructureModule{}