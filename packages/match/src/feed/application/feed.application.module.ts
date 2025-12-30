import { Module, Provider } from "@nestjs/common";
import { FeedInfrastructureModule } from "../infrastructure/feed.infrastructure.module";
import { GetMyFeedHandler } from "./service/query/get-my-feed.query";
import { MessageRouter } from "./service/message-router";
import { EventPublisherPort } from "@app/feed/domain/port/event-publisher.port";
import { KafkaProducerPort } from "@app/feed/domain/port/kafka-producer.port";
import { UpdateFeedItemStatusHandler } from "./service/command/update-feed-status.command";
import { CreateFeedCommand } from "./port/command/create-feed.port";
import { UpdateFeedItemStatusCommand } from "./port/command/update-feed-status.port";
import { CreateFeedCommandHandler } from "./service/command/create-feed.command";
import { GetMyFeedQuery } from "./port/query/get-my-feed.port";

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