import { Module, type Provider } from "@nestjs/common";
import { FeedInfrastructureModule } from "../infrastructure/feed.infrastructure.module.js";
import { GetMyFeedHandler } from "./service/query/get-my-feed.query.js";
import { MessageRouter } from "./service/message-router.js";
import { EventPublisherPort } from "#app/feed/domain/port/event-publisher.port";
import { KafkaProducerPort } from "#app/feed/domain/port/kafka-producer.port";
import { UpdateFeedItemStatusHandler } from "./service/command/update-feed-status.command.js";
import { CreateFeedCommand } from "./port/command/create-feed.port.js";
import { UpdateFeedItemStatusCommand } from "./port/command/update-feed-status.port.js";
import { CreateFeedCommandHandler } from "./service/command/create-feed.command.js";
import { GetMyFeedQuery } from "./port/query/get-my-feed.port.js";

const commands : Provider[] = [
    {
        provide : CreateFeedCommand,
        useClass : CreateFeedCommandHandler
    },
    {
        provide : UpdateFeedItemStatusCommand,
        useClass : UpdateFeedItemStatusHandler
    }
]

const queries : Provider[] = [
    {
        provide : GetMyFeedQuery,
        useClass : GetMyFeedHandler
    }
]

const providers : Provider[] = [
    ...commands,
    ...queries,
    {
        provide : MessageRouter,
        useFactory : (eventPublisher : EventPublisherPort,kafkaProducer : KafkaProducerPort) => 
            new MessageRouter(
                {
                    rules : [
                        { match: { prefix: 'match.' }, target: 'event' },
                        { match: { prefix: 'chat.' }, target: 'kafka' },
                        { match: { prefix: 'notification.' }, target: 'kafka' },
                    ],
                    default : 'event',
                },
                eventPublisher,
                kafkaProducer
            ),
        inject : [EventPublisherPort,KafkaProducerPort]
    },
]

@Module({
    imports : [
        FeedInfrastructureModule,
    ],
    providers,
})
export class FeedApplicationModule{}