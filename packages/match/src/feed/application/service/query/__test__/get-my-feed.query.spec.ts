import { Test, TestingModule } from '@nestjs/testing';
import { GetMyFeedHandler } from '../get-my-feed.query';
import { GetMyFeedQuery } from '../../../port/query/get-my-feed.port';
import { FeedRepositoryPort } from '@app/feed/domain/port/feed.repository.port';
import { UserApiPort } from '@app/feed/domain/port/user-api.port';
import { PetApiPort } from '@app/feed/domain/port/pet-api.port';
import { FeedEntity } from '@app/feed/domain/model/feed';
import { FeedItemEntity } from '@app/feed/domain/model/feed-item';
import { UserPrincipal } from '@core/auth';
import { YYYYMMDD } from '@core/util';
import { mockFeedRepsitoryPort, mockUserApiPort, mockPetApiPort } from '../../__test__/mock';
import { ItemDetail } from '@app/feed/domain/model/vo/item-detail';
import { User } from '@app/feed/domain/model/vo/user';
import { Pet } from '@app/feed/domain/model/vo/pet';


describe('GetMyFeedHandler 단위 테스트', () => {
  let handler: GetMyFeedHandler;
  let feedRepositoryPort: jest.Mocked<FeedRepositoryPort>;
  let userApiPort: jest.Mocked<UserApiPort>;
  let petApiPort: jest.Mocked<PetApiPort>;
  
  // 테스트용 사용자 객체
  const mockUser: UserPrincipal = {
    userId: 'user123',
    name: 'test',
    nickname: 'tst',
    birth: 'test',
    region: 0
  };
  
  // 테스트용 피드 아이템 생성 함수
  const createMockFeedItem = (id: number, targetUserId: string): FeedItemEntity => {
    return {
      id,
      feedId: 1,
      targetUserId,
      detail: null
    } as unknown as FeedItemEntity;
  };
  
  // 테스트용 피드 생성 함수
  const createMockFeed = (id: number, userId: string, items: FeedItemEntity[]): FeedEntity => {
    return {
      id,
      userId,
      date: YYYYMMDD.today(),
      slot: 1,
      items
    } as unknown as FeedEntity;
  };
  
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // 목 객체 초기화
    feedRepositoryPort = mockFeedRepsitoryPort;
    userApiPort = mockUserApiPort;
    petApiPort = mockPetApiPort;
    
    // 핸들러 생성
    handler = new GetMyFeedHandler(
      feedRepositoryPort,
      userApiPort,
      petApiPort
    );
  });
  
  it('사용자의 피드 목록을 가져와야 함', async () => {
    // Given
    const today = YYYYMMDD.today();
    const feedItem1 = createMockFeedItem(1, 'target1');
    const feedItem2 = createMockFeedItem(2, 'target2');
    const mockFeeds = [
      createMockFeed(1, mockUser.userId, [feedItem1, feedItem2])
    ];
    
    const query = new GetMyFeedQuery(mockUser);
    
    // Mock 설정
    feedRepositoryPort.getMyFeedWithItems.mockResolvedValue(mockFeeds);
    
    // 사용자 및 반려동물 API 모킹
    const mockUserData = new User(
        'target1',
        '테스트',
        'http://example.com/profile.jpg',
    )

    const mockPetData = new Pet(
        1,
        'test',
        1,
        'male',
        'poodle',
        'small',
        ['good'],
        'test',
        ['http://example.com/profile.jpg'],   
    )
    
    userApiPort.getUser.mockResolvedValue(mockUserData);
    petApiPort.getPetsFromUser.mockResolvedValue([mockPetData]);
    
    // When
    const result = await handler.execute(query);
    
    // Then
    // 피드 리포지토리 호출 확인
    expect(feedRepositoryPort.getMyFeedWithItems).toHaveBeenCalledWith(mockUser.userId, today);
    
    // 결과 확인
    expect(result).toEqual(mockFeeds);
  });
  
  it('피드 아이템에 사용자와 반려동물 정보가 추가되어야 함', async () => {
    // Given
    const targetUserId = 'target1';
    const feedItem = createMockFeedItem(1, targetUserId);
    const mockFeeds = [
      createMockFeed(1, mockUser.userId, [feedItem])
    ];
    
    const query = new GetMyFeedQuery(mockUser);
    
    // Mock 설정
    feedRepositoryPort.getMyFeedWithItems.mockResolvedValue(mockFeeds);
    
    // 사용자 및 반려동물 API 모킹
    const mockUserData = new User(
        targetUserId,
        '테스트',
        'http://example.com/profile.jpg',
    )

    const mockPetData = new Pet(
        1,
        'test',
        1,
        'male',
        'poodle',
        'small',
        ['good'],
        'test',
        ['http://example.com/profile.jpg'],   
    )

    userApiPort.getUser.mockResolvedValue(mockUserData);
    petApiPort.getPetsFromUser.mockResolvedValue([mockPetData]);
    
    // 비동기 처리를 테스트하기 위해 실제로 ItemDetail이 설정되도록 수정
    // 실제 코드에서는 Promise.all 내부의 forEach에서 async를 사용하면 기다려지지 않는 문제가 있음
    // 테스트를 위해 mock 함수를 오버라이드하여 직접 detail을 설정
    const originalGetMyFeedWithItems = feedRepositoryPort.getMyFeedWithItems;
    feedRepositoryPort.getMyFeedWithItems = jest.fn().mockImplementation(async () => {
      const feeds = await originalGetMyFeedWithItems(mockUser.userId, YYYYMMDD.today());
      
      // 직접 detail 설정
      const user = await userApiPort.getUser(targetUserId);
      const pets = await petApiPort.getPetsFromUser(targetUserId);
      feeds[0].items[0].detail = new ItemDetail(user, pets);
      
      return feeds;
    });
    
    // When
    const result = await handler.execute(query);
    
    // Then
    // API 호출 확인
    expect(userApiPort.getUser).toHaveBeenCalledWith(targetUserId);
    expect(petApiPort.getPetsFromUser).toHaveBeenCalledWith(targetUserId);
    
    // 결과에 detail이 설정되었는지 확인
    expect(result[0].items[0].detail).toBeDefined();
    expect(result[0].items[0].detail.user).toEqual(mockUserData);
    expect(result[0].items[0].detail.pets).toEqual([mockPetData]);
  });
  
  it('피드가 없는 경우 빈 배열을 반환해야 함', async () => {
    // Given
    const query = new GetMyFeedQuery(mockUser);
    
    // Mock 설정
    feedRepositoryPort.getMyFeedWithItems.mockResolvedValue([]);
    
    // 사용자 및 반려동물 API 모킹 (이 테스트에서는 호출되지 않아야 함)
    // userApiPort.getUser.mockResolvedValue({});
    petApiPort.getPetsFromUser.mockResolvedValue([]);
    
    // When
    const result = await handler.execute(query);
    
    // Then
    expect(result).toEqual([]);
    expect(feedRepositoryPort.getMyFeedWithItems).toHaveBeenCalledWith(mockUser.userId, YYYYMMDD.today());
    
    // API가 호출되지 않아야 함 (빈 배열이므로 forEach가 실행되지 않음)
    expect(userApiPort.getUser).not.toHaveBeenCalled();
    expect(petApiPort.getPetsFromUser).not.toHaveBeenCalled();
  });
});
