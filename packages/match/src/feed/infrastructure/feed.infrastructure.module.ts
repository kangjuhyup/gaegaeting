import { Module, Provider } from "@nestjs/common";
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
import { KafkaProducerModule } from "@core/kafka";
import { EventPublisherPort } from "../domain/port/event-publisher.port";
import { EventPublisherAdapter } from "./adapter/outbound/event/event-publisher.adapter";
import { KafkaProducerPort } from "../domain/port/kafka-producer.port";
import { KafkaProducerAdapter } from "./adapter/outbound/event/kafka-producer.adapter";
import { ClockPort } from "../application/port/clock.port";
import { SystemClockAdapter } from "./adapter/outbound/clock/system-clock.adapter";
import { FeedResolver } from "./adapter/inbound/gql/feed.resolver";
import { LocationRepositoryPort } from "@app/location/domain/port/location.repostiory.port";
import { LocationOrmRepository } from "@app/location/infrastructure/adapter/outbound/presistence/location.orm.repository";
import { ENV_KEY } from "@app/config/env.config";
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
    ],
    providers : [
        ...providers,
        FeedResolver,
    ],
    exports : providers
})
export class FeedInfrastructureModule {}