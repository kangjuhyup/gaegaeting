import { Module, Provider } from "@nestjs/common";
import { FeedController } from "./adapter/inbound/http/feed.controller";
import { FeedRepositoryPort } from "../domain/port/feed.repository.port";
import { PetApiPort } from "../domain/port/pet-api.port";
import { PetApiAdpater } from "./adapter/outbound/api/pet-api.adapter";
import { HttpModule } from "@core/http";
import { UserApiPort } from "../domain/port/user-api.port";
import { UserApiAdapter } from "./adapter/outbound/api/user-api.adapter";
import { FeedOrmMapper } from "./adapter/outbound/persistence/mapper/feed-orm.mapper";
import { FeedOrmRepository } from "./adapter/outbound/persistence/feed.orm.repository";
import { FeedItemRepositoryPort } from "../domain/port/feed-item.repository.port";
import { FeedItemOrmRepository } from "./adapter/outbound/persistence/feed-item.orm.repository";
import { FeedItemOrmMapper } from "./adapter/outbound/persistence/mapper/feed-item-orm.mapper";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { KafkaProducerModule } from "@core/kafka";
import { EventPublisherPort } from "../domain/port/event-publisher.port";
import { EventPublisherAdapter } from "./adapter/outbound/event/event-publisher.adapter";
import { KafkaProducerPort } from "../domain/port/kafka-producer.port";
import { KafkaProducerAdapter } from "./adapter/outbound/event/kafka-producer.adapter";

const providers : Provider[] = [
    FeedOrmMapper,
    FeedItemOrmMapper,
    {
        provide : FeedRepositoryPort,
        useClass : FeedOrmRepository
    },
    {
        provide : FeedItemRepositoryPort,
        useClass : FeedItemOrmRepository
    },
    {
        provide : PetApiPort,
        useClass : PetApiAdpater
    },
    {
        provide : UserApiPort,
        useClass : UserApiAdapter
    },
    {
        provide : EventPublisherPort,
        useClass : EventPublisherAdapter
    },
    {
        provide : KafkaProducerPort,
        useClass : KafkaProducerAdapter
    }
]

@Module({
    imports : [
        HttpModule.forService('Match-Feed', {
            timeout : 5000,
            retryCount : 3,
        }),
        EventEmitterModule.forRoot(),
        KafkaProducerModule.forRoot({
            clientId: 'feed-service',
            brokers: ['localhost:9092'],
            ssl: false,
            sasl: null,
            allowAutoTopicCreation: true,
            defaultHeaders: {
                'Content-Type': 'application/json',
            },
        })
    ],
    controllers: [
        FeedController
    ],
    providers,
    exports : providers
})
export class FeedInfrastructureModule {}