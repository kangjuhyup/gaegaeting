import { Test, TestingModule } from '@nestjs/testing';
import { CancelLikeHandler } from '../cancel-like.command';
import { CancelLikeCommand } from '../../../port/command/cancel-like.port';
import { LikeRepositoryPort } from '@app/like/domain/port/like.repository.port';
import { ForbiddenException } from '@nestjs/common';
import { LikeEntity } from '@app/like/domain/model/like';
import { UserPrincipal } from '@core/auth';

describe('CancelLikeHandler 단위 테스트', () => {
  let handler: CancelLikeHandler;
  let likeRepositoryPort: jest.Mocked<LikeRepositoryPort>;

  // 테스트용 모의 객체 및 데이터
  const mockUser = {
    userId: 'user-123',
  } as UserPrincipal;

  const mockLikeId = 1;

  // 테스트용 Like 엔티티
  const mockLike = {
    id: mockLikeId,
    likerId: 'liker-123',
    likeeId: 'user-123',
    source: 0,
    etc: { active: true },
    cancel: jest.fn()
  } as unknown as LikeEntity;

  // 다른 사용자의 Like 엔티티
  const mockOtherUserLike = {
    id: mockLikeId,
    likerId: 'liker-123',
    likeeId: 'other-user-456',
    source: 0,
    etc: { active: true },
    cancel: jest.fn()
  } as unknown as LikeEntity;

  beforeEach(async () => {
    // 모의 객체 설정
    likeRepositoryPort = {
      selectLikeFromId: jest.fn(),
      updateLike: jest.fn(),
      saveLike: jest.fn(),
      selectLikeInFromUserId: jest.fn(),
      selectLikeOutFromUserId: jest.fn()
    } as jest.Mocked<LikeRepositoryPort>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CancelLikeHandler,
        {
          provide: LikeRepositoryPort,
          useValue: likeRepositoryPort
        }
      ]
    }).compile();

    handler = module.get<CancelLikeHandler>(CancelLikeHandler);
  });

  it('사용자가 자신이 받은 Like를 취소할 수 있어야 함', async () => {
    // Given
    const command = new CancelLikeCommand(mockUser, mockLikeId);
    likeRepositoryPort.selectLikeFromId.mockResolvedValue(mockLike);
    likeRepositoryPort.updateLike.mockResolvedValue(mockLike);

    // When
    await handler.execute(command);

    // Then
    expect(likeRepositoryPort.selectLikeFromId).toHaveBeenCalledWith(mockLikeId);
    expect(mockLike.cancel).toHaveBeenCalled();
    expect(likeRepositoryPort.updateLike).toHaveBeenCalledWith(mockLike);
  });

  it('사용자가 자신이 받지 않은 Like를 취소하려고 하면 예외가 발생해야 함', async () => {
    // Given
    const command = new CancelLikeCommand(mockUser, mockLikeId);
    likeRepositoryPort.selectLikeFromId.mockResolvedValue(mockOtherUserLike);

    // When & Then
    await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
    expect(likeRepositoryPort.selectLikeFromId).toHaveBeenCalledWith(mockLikeId);
    expect(mockOtherUserLike.cancel).not.toHaveBeenCalled();
    expect(likeRepositoryPort.updateLike).not.toHaveBeenCalled();
  });

  it('존재하지 않는 Like ID로 요청하면 리포지토리에서 예외가 전파되어야 함', async () => {
    // Given
    const command = new CancelLikeCommand(mockUser, 999);
    const error = new Error('Like not found');
    likeRepositoryPort.selectLikeFromId.mockRejectedValue(error);

    // When & Then
    await expect(handler.execute(command)).rejects.toThrow(error);
    expect(likeRepositoryPort.selectLikeFromId).toHaveBeenCalledWith(999);
    expect(likeRepositoryPort.updateLike).not.toHaveBeenCalled();
  });
});
