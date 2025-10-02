import { CreateFeedCommandHandler } from '../command/create-feed.command';
import { CreateFeedCommand } from '../../port/command/create-feed.port';
import { FeedEntity } from '@app/feed/domain/model/feed';
import { FeedItemEntity } from '@app/feed/domain/model/feed-item';
import { LocationEntity } from '@app/location/domain/model/location';
import { UserPrincipal } from '@core/auth';
import { YYYYMMDD } from '@core/util';
import {
  mockFeedRepsitoryPort,
  mockFeedItemRepositoryPort,
  mockLocationRepositoryPort
} from './mock';

// Mock @Transactional decorator
jest.mock('@core/database', () => ({
  ...jest.requireActual('@core/database'),
  Transactional: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor
}));

describe('CreateFeedCommandHandler', () => {
  let handler: CreateFeedCommandHandler;
  let mockUser: UserPrincipal;
  let mockCommand: CreateFeedCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    
    handler = new CreateFeedCommandHandler(
      mockFeedRepsitoryPort,
      mockFeedItemRepositoryPort,
      mockLocationRepositoryPort
    );

    mockUser = {
      userId: 'user-123',
      name: 'Test User',
      nickname: 'testuser',
      birth: '1990-01-01',
      region : 1,
    };

    mockCommand = new CreateFeedCommand(mockUser);
  });

  describe('execute', () => {
    it('사용자 위치가 없으면 feed만 생성하고 feedItem은 생성하지 않아야 함', async () => {
      // Given
      const mockFeed = FeedEntity.of({
        userId: mockUser.userId,
        date: YYYYMMDD.today(),
        slot: 1,
        expiresAt: new Date()
      });
      mockFeed.setPersistence(1, new Date(), new Date());

      mockFeedRepsitoryPort.saveFeed.mockResolvedValue(mockFeed);
      mockLocationRepositoryPort.selectLocationFromUserId.mockResolvedValue(null);

      // When
      const result = await handler.execute(mockCommand);

      // Then
      expect(mockFeedRepsitoryPort.saveFeed).toHaveBeenCalledTimes(1);
      expect(mockLocationRepositoryPort.selectLocationFromUserId).toHaveBeenCalledWith(mockUser.userId);
      expect(mockLocationRepositoryPort.findNearbyTargets).not.toHaveBeenCalled();
      expect(mockFeedItemRepositoryPort.saveFeedItem).not.toHaveBeenCalled();
      expect(result).toEqual(mockFeed);
    });

    it('주변 타겟이 없으면 feed만 생성하고 feedItem은 생성하지 않아야 함', async () => {
      // Given
      const mockLocation = LocationEntity.of({
        latitude: 37.5665,
        longitude: 126.9780,
        
      });

      const mockFeed = FeedEntity.of({
        userId: mockUser.userId,
        date: YYYYMMDD.today(),
        slot: 2,
        expiresAt: new Date()
      });
      mockFeed.setPersistence(1, new Date(), new Date());

      mockFeedRepsitoryPort.saveFeed.mockResolvedValue(mockFeed);
      mockLocationRepositoryPort.selectLocationFromUserId.mockResolvedValue(mockLocation);
      mockLocationRepositoryPort.findNearbyTargets.mockResolvedValue([]);

      // When
      const result = await handler.execute(mockCommand);

      // Then
      expect(mockLocationRepositoryPort.findNearbyTargets).toHaveBeenCalledWith(
        mockUser.userId,
        mockLocation.latitude,
        mockLocation.longitude,
        YYYYMMDD.today()
      );
      expect(mockFeedItemRepositoryPort.saveFeedItem).not.toHaveBeenCalled();
      expect(result).toEqual(mockFeed);
    });

    it('주변 타겟이 있으면 feed와 feedItem을 모두 생성해야 함', async () => {
      // Given
      const mockLocation = LocationEntity.of({
        latitude: 37.5665,
        longitude: 126.9780,
      });

      const mockFeed = FeedEntity.of({
        userId: mockUser.userId,
        date: YYYYMMDD.today(),
        slot: 3,
        expiresAt: new Date()
      });
      mockFeed.setPersistence(1, new Date(), new Date());

      const targetUserIds = ['target-1', 'target-2'];
      const mockFeedItems = targetUserIds.map(targetUserId => {
        const item = FeedItemEntity.of({
          feedId: 1,
          targetUserId,
          state: 1
        });
        item.setPersistence(Math.random(), new Date(), new Date());
        return item;
      });

      mockFeedRepsitoryPort.saveFeed.mockResolvedValue(mockFeed);
      mockLocationRepositoryPort.selectLocationFromUserId.mockResolvedValue(mockLocation);
      mockLocationRepositoryPort.findNearbyTargets.mockResolvedValue(targetUserIds);
      mockFeedItemRepositoryPort.saveFeedItem
        .mockResolvedValueOnce(mockFeedItems[0])
        .mockResolvedValueOnce(mockFeedItems[1]);

      // When
      const result = await handler.execute(mockCommand);

      // Then
      expect(mockLocationRepositoryPort.findNearbyTargets).toHaveBeenCalledWith(
        mockUser.userId,
        mockLocation.latitude,
        mockLocation.longitude,
        YYYYMMDD.today()
      );
      expect(mockFeedItemRepositoryPort.saveFeedItem).toHaveBeenCalledTimes(2);
      expect(result.items).toEqual(mockFeedItems);
    });

    it('시간대에 따라 올바른 슬롯을 생성해야 함', async () => {
      // Given
      const originalGetHours = Date.prototype.getHours;
      
      // 오전 6시로 설정 (슬롯 1)
      Date.prototype.getHours = jest.fn().mockReturnValue(6);

      const mockFeed = FeedEntity.of({
        userId: mockUser.userId,
        date: YYYYMMDD.today(),
        slot: 1,
        expiresAt: new Date()
      });
      mockFeed.setPersistence(1, new Date(), new Date());

      mockFeedRepsitoryPort.saveFeed.mockResolvedValue(mockFeed);
      mockLocationRepositoryPort.selectLocationFromUserId.mockResolvedValue(null);

      // When
      const result = await handler.execute(mockCommand);

      // Then
      expect(mockFeedRepsitoryPort.saveFeed).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.userId,
          slot: 1
        })
      );

      // 원래 메서드 복원
      Date.prototype.getHours = originalGetHours;
    });
  });

  describe('getCurrentSlot', () => {
    let originalGetHours: () => number;

    beforeEach(() => {
      originalGetHours = Date.prototype.getHours;
    });

    afterEach(() => {
      Date.prototype.getHours = originalGetHours;
    });

    it('0-7시는 슬롯 1을 반환해야 함', () => {
      Date.prototype.getHours = jest.fn().mockReturnValue(5);
      const slot = (handler as any).getCurrentSlot();
      expect(slot).toBe(1);
    });

    it('8-15시는 슬롯 2를 반환해야 함', () => {
      Date.prototype.getHours = jest.fn().mockReturnValue(12);
      const slot = (handler as any).getCurrentSlot();
      expect(slot).toBe(2);
    });

    it('16-23시는 슬롯 3을 반환해야 함', () => {
      Date.prototype.getHours = jest.fn().mockReturnValue(20);
      const slot = (handler as any).getCurrentSlot();
      expect(slot).toBe(3);
    });
  });

  describe('getSlotExpiresAt', () => {
    it('슬롯 1은 다음날 8시에 만료되어야 함', () => {
      const expiresAt = (handler as any).getSlotExpiresAt(1);
      expect(expiresAt.getHours()).toBe(8);
      expect(expiresAt.getMinutes()).toBe(0);
    });

    it('슬롯 2는 다음날 16시에 만료되어야 함', () => {
      const expiresAt = (handler as any).getSlotExpiresAt(2);
      expect(expiresAt.getHours()).toBe(16);
      expect(expiresAt.getMinutes()).toBe(0);
    });

    it('슬롯 3은 다다음날 0시에 만료되어야 함', () => {
      const expiresAt = (handler as any).getSlotExpiresAt(3);
      expect(expiresAt.getHours()).toBe(0);
      expect(expiresAt.getMinutes()).toBe(0);
      
      // 다다음날인지 확인
      const today = new Date();
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() + 2);
      expectedDate.setHours(0, 0, 0, 0);
      
      expect(expiresAt.getDate()).toBe(expectedDate.getDate());
    });
  });
});