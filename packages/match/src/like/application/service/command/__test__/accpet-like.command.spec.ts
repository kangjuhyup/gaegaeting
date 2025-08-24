import { EventPublisherPort } from "@app/like/domain/port/event-publisher.port"
import { LikeRepositoryPort } from "@app/like/domain/port/like.repository.port"
import { mockLikeRepository, mockEventPublisher } from "../../__test__/mock"
import { AcceptLikeHandler } from "../accept-like.command"
import { AcceptLikeCommand } from "@app/like/application/port/command/accept-like.command"
import { LikeEntity } from "@app/like/domain/model/like"
import { UserPrincipal } from "@core/auth"
import { Topics } from "@app/common/topic"
import { MatchPairCreatedV1Payload } from "@app/common/payload"

describe('AcceptLikeHandler 단위 테스트', () => {

    let handler : AcceptLikeHandler
    let eventPublisher
    let likeRepositoryPort
    
    // 테스트용 모의 객체 및 데이터
    const mockUser = {
        userId: 'user-123',
    } as UserPrincipal;
    
    const mockLikeId = 1;
    
    // 테스트용 Like 엔티티
    const mockLike = {
        id: mockLikeId,
        likerId: 'liker-456',
        likeeId: 'user-123',
        source: 0,
        etc: { active: true },
    } as unknown as LikeEntity;
    
    // 내가 상대방에게 보낸 Like 엔티티
    const mockMyLike = {
        id: 2,
        likerId: 'user-123',
        likeeId: 'liker-456',
        source: 0,
        etc: { active: true },
    } as unknown as LikeEntity;
    
    beforeEach(() => {
        jest.clearAllMocks();
        likeRepositoryPort = mockLikeRepository
        eventPublisher = mockEventPublisher

        handler = new AcceptLikeHandler(
            likeRepositoryPort,
            eventPublisher
        )
    })
    
    it('Like를 수락하면 상대방에게 Like를 보내고 매칭 이벤트를 발행해야 함', async () => {
        // Given
        const command = new AcceptLikeCommand(mockUser, mockLikeId);
        likeRepositoryPort.selectLikeFromId.mockResolvedValue(mockLike);
        likeRepositoryPort.saveLike.mockResolvedValue(mockMyLike);
        
        // When
        await handler.execute(command);
        
        // Then
        expect(likeRepositoryPort.selectLikeFromId).toHaveBeenCalledWith(mockLikeId);
        expect(likeRepositoryPort.saveLike).toHaveBeenCalledWith(
            expect.objectContaining({
                likerId: mockUser.userId,
                likeeId: mockLike.likerId,
                source: mockLike.source,
                etc: expect.objectContaining({ active: true })
            })
        );
        expect(eventPublisher.publish).toHaveBeenCalledWith(
            Topics.MATCH_PAIR_CREATED_V1,
            expect.any(MatchPairCreatedV1Payload)
        );
        
        // 페이로드 검증
        const publishCall = eventPublisher.publish.mock.calls[0];
        const payload = publishCall[1] as MatchPairCreatedV1Payload;
        expect(payload.leftUserId).toBe(mockUser.userId);
        expect(payload.rightUserId).toBe(mockLike.likerId);
        expect(payload.likeAId).toBe(mockLike.id);
        expect(payload.likeBId).toBe(mockMyLike.id);
    });
    
    it('존재하지 않는 Like ID로 요청하면 리포지토리에서 예외가 전파되어야 함', async () => {
        // Given
        const command = new AcceptLikeCommand(mockUser, 999);
        const error = new Error('Like not found');
        likeRepositoryPort.selectLikeFromId.mockRejectedValue(error);
        
        // When & Then
        await expect(handler.execute(command)).rejects.toThrow(error);
        expect(likeRepositoryPort.selectLikeFromId).toHaveBeenCalledWith(999);
        expect(likeRepositoryPort.saveLike).not.toHaveBeenCalled();
        expect(eventPublisher.publish).not.toHaveBeenCalled();
    });
})