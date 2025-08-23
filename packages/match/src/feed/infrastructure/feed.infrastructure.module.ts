import { Module, Provider } from "@nestjs/common";
import { FeedController } from "./persentation/feed.controller";
import { FeedRepositoryPort } from "../domain/port/feed.repository.port";
import { PetApiPort } from "../domain/port/pet-api.port";
import { PetApiAdpater } from "./adapter/pet-api.adapter";
import { HttpModule } from "@core/http";
import { UserApiPort } from "../domain/port/user-api.port";
import { UserApiAdapter } from "./adapter/user-api.adapter";
import { FeedOrmMapper } from "./repository/mapper/feed-orm.mapper";
import { FeedOrmRepository } from "./repository/feed.orm.repository";
import { FeedItemRepositoryPort } from "../domain/port/feed-item.repository.port";
import { FeedItemOrmRepository } from "./repository/feed-item.orm.repository";
import { FeedItemOrmMapper } from "./repository/mapper/feed-item-orm.mapper";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { KafkaProducerModule } from "@core/kafka";

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
    }
]

@Module({
    imports : [
        HttpModule.forService('FeedService'),
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