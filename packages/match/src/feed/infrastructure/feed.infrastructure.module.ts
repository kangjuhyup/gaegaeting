import { Module, type Provider } from "@nestjs/common";
import { FeedRepositoryPort } from "../domain/port/feed.repository.port.js";
import { PetApiPort } from "../domain/port/pet-api.port.js";
import { PetApiAdpater } from "./adapter/outbound/api/pet-api.adapter.js";
import { HttpModule } from "@core/http";
import { UserApiPort } from "../domain/port/user-api.port.js";
import { UserApiAdapter } from "./adapter/outbound/api/user-api.adapter.js";
import { FeedOrmMapper } from "./adapter/outbound/persistence/mapper/feed-orm.mapper.js";
import { FeedOrmRepository } from "./adapter/outbound/persistence/feed.orm.repository.js";
import { FeedItemRepositoryPort } from "../domain/port/feed-item.repository.port.js";
import { FeedItemOrmRepository } from "./adapter/outbound/persistence/feed-item.orm.repository.js";
import { FeedItemOrmMapper } from "./adapter/outbound/persistence/mapper/feed-item-orm.mapper.js";
import { KafkaProducerModule } from "@core/kafka";
import { EventPublisherPort } from "../domain/port/event-publisher.port.js";
import { EventPublisherAdapter } from "./adapter/outbound/event/event-publisher.adapter.js";
import { KafkaProducerPort } from "../domain/port/kafka-producer.port.js";
import { KafkaProducerAdapter } from "./adapter/outbound/event/kafka-producer.adapter.js";
import { ClockPort } from "../application/port/clock.port.js";
import { SystemClockAdapter } from "./adapter/outbound/clock/system-clock.adapter.js";
import { FeedResolver } from "./adapter/inbound/gql/feed.resolver.js";
import { LocationRepositoryPort } from "#app/location/domain/port/location.repostiory.port";
import { LocationOrmRepository } from "#app/location/infrastructure/adapter/outbound/presistence/location.orm.repository";
import { ENV_KEY } from "#app/config/env.config";
import { ConfigModule, ConfigService } from "@nestjs/config";

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
        provide : LocationRepositoryPort,
        useClass : LocationOrmRepository
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
    },
    // time (for deterministic tests)
    {
        provide: ClockPort,
        useClass: SystemClockAdapter,
    },
]

@Module({
    imports : [
        HttpModule.forService('Match-Feed', {
            timeout : 5000,
            retryCount : 3,
        }),
        KafkaProducerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                return {
                    clientId: "feed-service",
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
    providers : [
        ...providers,
        FeedResolver,
    ],
    exports : providers
})
export class FeedInfrastructureModule {}