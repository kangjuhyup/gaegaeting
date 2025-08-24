import { KafkaProducerPort } from "@app/like/domain/port/kafka-producer.port"
import { LikeRepositoryPort } from "@app/like/domain/port/like.repository.port"
import { mockEventPublisher, mockKafkaProducer, mockLikeRepository } from "../../__test__/mock"
import { EventPublisherPort } from "@app/like/domain/port/event-publisher.port"
import { SaveLikeHandler } from "../save-like.command"
import { SaveLikeCommand } from "@app/like/application/port/command/save-like.port"
import { LikeEntity } from "@app/like/domain/model/like"
import { Topics } from "@app/common/topic"
import { MatchPairCreatedV1Payload, NotificationFcmSendV1Payload } from "@app/common/payload"

describe('SaveLikeHandler 단위 테스트', () => {

    let handler : SaveLikeHandler

    let eventPublisher
    let kafkaProducer
    let likeRepositoryPort
    
    // 테스트용 모의 객체 및 데이터
    const mockLikerId = 'liker-123';
    const mockLikeeId = 'likee-456';
    const mockSource = 0;
    
    // 테스트용 Like 엔티티
    const mockLike = LikeEntity.of({
        likerId : mockLikerId,
        likeeId : mockLikeeId,
        source : mockSource,
        active: true,
    }).setPersistence(1,new Date(),new Date())
    
    // 상대방이 나에게 보낸 Like 엔티티
    const mockExistingLike = LikeEntity.of({
        likerId : mockLikeeId,
        likeeId : mockLikerId,
        source : mockSource,
        active: true,
    }).setPersistence(2,new Date(),new Date())
    
    beforeEach(() => {
        jest.clearAllMocks();
        likeRepositoryPort = mockLikeRepository
        kafkaProducer = mockKafkaProducer
        eventPublisher = mockEventPublisher

        handler = new SaveLikeHandler(
            likeRepositoryPort,
            kafkaProducer,
            eventPublisher
        )
    })
    
    it('상대방이 나에게 Like를 한 적이 없을 때 FCM 메시지를 발송해야 함', async () => {
        // Given
        const command = new SaveLikeCommand(mockLikerId, mockLikeeId, mockSource);
        likeRepositoryPort.saveLike.mockResolvedValue(mockLike);
        likeRepositoryPort.selectLikeInFromUserId.mockResolvedValue([]);
        
        // When
        const result = await handler.execute(command);
        
        // Then
        expect(likeRepositoryPort.saveLike).toHaveBeenCalledWith(
            expect.objectContaining({
                likerId: mockLikerId,
                likeeId: mockLikeeId,
                source: mockSource,
                etc: expect.objectContaining({ active: true })
            })
        );
        expect(likeRepositoryPort.selectLikeInFromUserId).toHaveBeenCalledWith(mockLikeeId);
        expect(kafkaProducer.produce).toHaveBeenCalledWith(
            Topics.NOTIFICATION_FCM_SEND_V1,
            expect.any(NotificationFcmSendV1Payload)
        );
        expect(eventPublisher.publish).not.toHaveBeenCalled();
        expect(result).toBe(mockLike);
        
        // 페이로드 검증
        const produceCall = kafkaProducer.produce.mock.calls[0];
        const payload = produceCall[1] as NotificationFcmSendV1Payload;
        expect(payload.type).toBe('like');
        expect(payload.userId).toBe(mockLikeeId);
        expect(payload.likeId).toBe(mockLike.id);
    });
    
    it('상대방이 나에게 이미 Like를 한 적이 있을 때 매칭 이벤트를 발행해야 함', async () => {
        // Given
        const command = new SaveLikeCommand(mockLikerId, mockLikeeId, mockSource);
        likeRepositoryPort.saveLike.mockResolvedValue(mockLike);
        likeRepositoryPort.selectLikeInFromUserId.mockResolvedValue([mockExistingLike]);
        
        // When
        const result = await handler.execute(command);
        
        // Then
        expect(likeRepositoryPort.saveLike).toHaveBeenCalledWith(
            expect.objectContaining({
                likerId: mockLikerId,
                likeeId: mockLikeeId,
                source: mockSource,
                etc: expect.objectContaining({ active: true })
            })
        );
        expect(likeRepositoryPort.selectLikeInFromUserId).toHaveBeenCalledWith(mockLikeeId);
        expect(eventPublisher.publish).toHaveBeenCalledWith(
            Topics.MATCH_PAIR_CREATED_V1,
            expect.any(MatchPairCreatedV1Payload)
        );
        expect(kafkaProducer.produce).not.toHaveBeenCalled();
        expect(result).toBe(mockLike);
        
        // 페이로드 검증
        const publishCall = eventPublisher.publish.mock.calls[0];
        const payload = publishCall[1] as MatchPairCreatedV1Payload;
        expect(payload.leftUserId).toBe(mockLikerId);
        expect(payload.rightUserId).toBe(mockLikeeId);
        expect(payload.likeAId).toBe(mockLike.id);
        expect(payload.likeBId).toBe(mockExistingLike.id);
    });
    
    it('리포지토리에서 예외가 발생하면 예외가 전파되어야 함', async () => {
        // Given
        const command = new SaveLikeCommand(mockLikerId, mockLikeeId, mockSource);
        const error = new Error('Repository error');
        likeRepositoryPort.saveLike.mockRejectedValue(error);
        
        // When & Then
        await expect(handler.execute(command)).rejects.toThrow(error);
        expect(likeRepositoryPort.saveLike).toHaveBeenCalled();
        expect(likeRepositoryPort.selectLikeInFromUserId).not.toHaveBeenCalled();
        expect(kafkaProducer.produce).not.toHaveBeenCalled();
        expect(eventPublisher.publish).not.toHaveBeenCalled();
    });
})