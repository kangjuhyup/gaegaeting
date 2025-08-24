import { EventPublisherPort } from "@app/like/domain/port/event-publisher.port";
import { KafkaProducerPort } from "@app/like/domain/port/kafka-producer.port";
import { LikeRepositoryPort } from "@app/like/domain/port/like.repository.port";

export const mockEventPublisher = {
    publish : jest.fn()
} as jest.Mocked<EventPublisherPort>

export const mockKafkaProducer = {
    produce : jest.fn()
} as jest.Mocked<KafkaProducerPort>

export const mockLikeRepository = {
    selectLikeFromId : jest.fn(),
    updateLike : jest.fn(),
    saveLike : jest.fn(),
    selectLikeInFromUserId : jest.fn(),
    selectLikeOutFromUserId : jest.fn()
} as jest.Mocked<LikeRepositoryPort>