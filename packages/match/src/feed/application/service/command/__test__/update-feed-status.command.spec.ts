import { Test, TestingModule } from '@nestjs/testing';
import { UpdateFeedItemStatusHandler } from '../update-feed-status.command';
import { FeedItemRepositoryPort } from '@app/feed/domain/port/feed-item.repository.port';
import { MessageRouter } from '../../message-router';
import { UpdateFeedItemStatusCommand } from '../../../port/command/update-feed-status.port';
import { FeedItemStatus } from '@app/feed/domain/enum/feed-item-status.enum';
import { FeedItemEntity } from '@app/feed/domain/model/feed-item';
import { Topics } from '../../../../../common/topic';
import { UserPrincipal } from '@core/auth';
import { mockFeedItemRepositoryPort, mockFeedRepsitoryPort } from '../../__test__/mock';
import { FeedRepositoryPort } from '@app/feed/domain/port/feed.repository.port';


class MockMessageRouter {
  sendMessageCalls: { topic: string; payload: any }[] = [];
  
  async sendMessage(topic: string, payload: any): Promise<void> {
    this.sendMessageCalls.push({ topic, payload });
  }
}

describe('UpdateFeedItemStatusHandler 단위 테스트', () => {
  let handler: UpdateFeedItemStatusHandler;
  let feedItemRepositoryPort : jest.Mocked<FeedItemRepositoryPort>;
  let messageRouter: MockMessageRouter;
  
  // 테스트용 사용자 객체
  const mockUser: UserPrincipal = {
    userId: 'user123',
    name : 'test',
    nickname : 'tst',
    birth : 'test',
    region : 0
  };
  
  // 테스트용 피드 아이템 생성 함수
  const createMockFeedItem = (id: number, status: FeedItemStatus = FeedItemStatus.DELIVERY): FeedItemEntity => {
    const feedItem = {
      id,
      feedId: 1,
      targetUserId: 'user123',
      state: status,
      setDelivery: jest.fn().mockImplementation(function() {
        this.state = FeedItemStatus.DELIVERY;
        return this;
      }),
      setView: jest.fn().mockImplementation(function() {
        this.state = FeedItemStatus.VIEW;
        return this;
      }),
      setLike: jest.fn().mockImplementation(function() {
        this.state = FeedItemStatus.LIKE;
        return this;
      }),
      setPass: jest.fn().mockImplementation(function() {
        this.state = FeedItemStatus.PASS;
        return this;
      })
    } as unknown as FeedItemEntity;
    
    return feedItem;
  };
  
  beforeEach(async () => {
    jest.clearAllMocks();
    // 목 객체 초기화
    messageRouter = new MockMessageRouter();
    feedItemRepositoryPort = mockFeedItemRepositoryPort
    // 핸들러 생성
    handler = new UpdateFeedItemStatusHandler(
      feedItemRepositoryPort,
      messageRouter as unknown as MessageRouter
    );
  });
  
  it('피드 아이템 상태를 DELIVERY로 업데이트해야 함', async () => {
    // Given
    const feedItemId = 1;
    const mockFeedItem = createMockFeedItem(feedItemId);
    const command = new UpdateFeedItemStatusCommand(mockUser, feedItemId, FeedItemStatus.DELIVERY);
    mockFeedItemRepositoryPort.getFeedItemFromId.mockResolvedValue(mockFeedItem);
    
    // When
    await handler.execute(command);
    
    // Then
    expect(mockFeedItem.setDelivery).toHaveBeenCalled();
    expect(messageRouter.sendMessageCalls.length).toBe(0); // 메시지가 전송되지 않아야 함
  });
  
  it('피드 아이템 상태를 VIEW로 업데이트해야 함', async () => {
    // Given
    const feedItemId = 2;
    const mockFeedItem = createMockFeedItem(feedItemId);
    const command = new UpdateFeedItemStatusCommand(mockUser, feedItemId, FeedItemStatus.VIEW);
    mockFeedItemRepositoryPort.getFeedItemFromId.mockResolvedValue(mockFeedItem);
    
    // When
    await handler.execute(command);
    
    // Then
    expect(mockFeedItem.setView).toHaveBeenCalled();
    expect(messageRouter.sendMessageCalls.length).toBe(0); // 메시지가 전송되지 않아야 함
  });
  
  it('피드 아이템 상태를 LIKE로 업데이트하고 메시지를 전송해야 함', async () => {
    // Given
    const feedItemId = 3;
    const mockFeedItem = createMockFeedItem(feedItemId);
    
    const command = new UpdateFeedItemStatusCommand(mockUser, feedItemId, FeedItemStatus.LIKE);
    mockFeedItemRepositoryPort.getFeedItemFromId.mockResolvedValue(mockFeedItem);
    
    // When
    await handler.execute(command);
    
    // Then
    expect(mockFeedItem.setLike).toHaveBeenCalled();
    
    // 메시지 전송 확인
    expect(messageRouter.sendMessageCalls.length).toBe(1);
    expect(messageRouter.sendMessageCalls[0].topic).toBe(Topics.MATCH_FEED_LIKE_V1);
    expect(messageRouter.sendMessageCalls[0].payload).toBe(mockFeedItem);
  });
  
  it('피드 아이템 상태를 PASS로 업데이트해야 함', async () => {
    // Given
    const feedItemId = 4;
    const mockFeedItem = createMockFeedItem(feedItemId);
    const command = new UpdateFeedItemStatusCommand(mockUser, feedItemId, FeedItemStatus.PASS);
    mockFeedItemRepositoryPort.getFeedItemFromId.mockResolvedValue(mockFeedItem);
    
    // When
    await handler.execute(command);
    
    // Then
    expect(mockFeedItem.setPass).toHaveBeenCalled();
    expect(messageRouter.sendMessageCalls.length).toBe(0); // 메시지가 전송되지 않아야 함
  });

});
