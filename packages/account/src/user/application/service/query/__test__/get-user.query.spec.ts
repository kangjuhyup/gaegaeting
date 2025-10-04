import { UserEntity } from '@app/user/domain/model/user';
import { GetUserHandler } from '../get-user.query';
import { GetUserQuery } from '@app/user/application/port/query/get-user.port';
import { UserRepositoryPort } from '@app/user/domain/port/user-repository.port';
import { UserStoragePort } from '@app/user/domain/port/user-storage.port';
import { UserProfileEntity } from '@app/user/domain/model/user-profile';
import { UserGender, UserRegion, UserStatus } from '@app/user/domain/enum/user.enum';
import { mockUserRepositoryPort, mockUserStoragePort } from '../../__test__/mock';

describe('GetUserHandler 단위 테스트', () => {
    // 모의 객체 선언
    let userRepositoryPort: jest.Mocked<UserRepositoryPort>;
    let userStoragePort: jest.Mocked<UserStoragePort>;
    let getUserHandler: GetUserHandler;
    
    // 테스트 데이터
    const userId = 'test-user-id';
    const mockDate = new Date();
    
    // 기본 유저 객체 생성 함수
    // 기본 유저 객체 생성 함수
    const createMockUser = (withProfiles: boolean = false) => {
        // withProfiles가 true면 프로필을 생성하고, false면 프로필 없이 생성
        const profiles = withProfiles 
            ? [
                UserProfileEntity.of({
                    path: 'test-path-1',
                    active: false
                }).setPersistence({ userId, no: 1 }, mockDate, mockDate),
                UserProfileEntity.of({
                    path: 'test-path-2',
                    active: true
                }).setPersistence({ userId, no: 2 }, mockDate, mockDate)
              ] 
            : undefined;
            
        const user = UserEntity.of({
            name : '테스트유저',
            email: 'test@example.com',
            nickname: '테스트유저',
            gender: UserGender.MALE,
            birthDate: mockDate,
            region: UserRegion.SEOUL,
            bio: '안녕하세요',
            status: UserStatus.ACTIVE,
            profiles: profiles
        }).setPersistence(userId, mockDate, mockDate);
        
        return user;
    };

    beforeEach(() => {
        // 모의 객체 초기화
        userRepositoryPort = mockUserRepositoryPort;
        userStoragePort = mockUserStoragePort;
        
        // 테스트 대상 객체 생성
        getUserHandler = new GetUserHandler(userRepositoryPort, userStoragePort);
    });

    describe('프로필사진 미업로드', () => {
        it('유저정보만 리턴한다.', async () => {
            // Given
            const mockUser = createMockUser(false); // 프로필 없는 유저
            userRepositoryPort.selectUserFromIdWithProfiles.mockResolvedValue(mockUser);
            
            // When
            const result = await getUserHandler.execute(new GetUserQuery(userId));
            
            // Then
            expect(result).toEqual(mockUser);
            expect(userStoragePort.hasMetadata).not.toHaveBeenCalled();
            expect(userRepositoryPort.updateUserAttachmentActive).not.toHaveBeenCalled();
            expect(userRepositoryPort.deleteUserAttachment).not.toHaveBeenCalled();
        });
    });

    describe('프로필사진 업로드', () => {
        it('프로필사진 활성상태를 검사한다', async () => {
            // Given
            // 활성 상태인 프로필만 있는 유저 생성
            const mockUser = UserEntity.of({
                name : '테스트유저',
                email: 'test@example.com',
                nickname: '테스트유저',
                gender: UserGender.MALE,
                birthDate: mockDate,
                region: UserRegion.SEOUL,
                bio: '안녕하세요',
                status: UserStatus.ACTIVE,
                profiles: [
                    UserProfileEntity.of({
                        path: 'test-path-2',
                        active: true // 활성 상태인 프로필만 있음
                    }).setPersistence({ userId, no: 2 }, mockDate, mockDate)
                ]
            }).setPersistence(userId, mockDate, mockDate);
            
            userRepositoryPort.selectUserFromIdWithProfiles.mockResolvedValue(mockUser);
            
            // When
            const result = await getUserHandler.execute(new GetUserQuery(userId));
            
            // Then
            expect(result.profiles).toHaveLength(1);
            expect(result.profiles[0].isActive).toBe(true);
            expect(userStoragePort.hasMetadata).not.toHaveBeenCalled(); // 이미 활성 상태이므로 메타데이터 확인 안함
        });

        it('전체 프로필사진을 리턴한다.', async () => {
            // Given
            const mockUser = createMockUser(true); // 프로필 있는 유저 (두 번째 프로필은 활성)
            userRepositoryPort.selectUserFromIdWithProfiles.mockResolvedValue(mockUser);
            userStoragePort.hasMetadata.mockResolvedValue(false); // 메타데이터 없음 (비활성 프로필 삭제될 것)
            
            // When
            const result = await getUserHandler.execute(new GetUserQuery(userId));
            
            // Then
            expect(result.profiles).toHaveLength(2);
            expect(result.profiles[0].id.no).toBe(1); // 활성 프로필만 남음
        });
        
        it('존재하지 않는 사용자 조회 시 에러를 발생시킨다', async () => {
            // Given
            userRepositoryPort.selectUserFromIdWithProfiles.mockResolvedValue(null);
            
            // When & Then
            await expect(getUserHandler.execute(new GetUserQuery('non-existent-id')))
                .rejects
                .toThrow('프로필을 찾을 수 없습니다.');
        });
    });
});