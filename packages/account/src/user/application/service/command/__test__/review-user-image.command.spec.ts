import { ReviewUserImageCommandHandler } from '../review-user-image.command';
import { ReviewUserImageCommand } from '@app/user/application/port/command/review-user-image.port';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UserEntity } from '@app/user/domain/model/user';
import { UserProfileEntity } from '@app/user/domain/model/user-profile';
import { UserGender, UserRegion, UserStatus } from '@app/user/domain/enum/user.enum';
import { mockUserRepositoryPort, mockUserStoragePort } from '../../__test__/mock';

// Mock DataSource for @Transactional decorator
const mockDataSource = {
    transaction: jest.fn((callback) => {
        return callback({} as any); // Mock EntityManager
    })
};

describe('ReviewUserImageCommandHandler 단위 테스트', () => {
    let reviewUserImageHandler: ReviewUserImageCommandHandler;
    const userId = 'test-user-id';
    const profilePath = 'test-path';
    const profileNo = 1;

    beforeEach(() => {
        jest.clearAllMocks();
        reviewUserImageHandler = new ReviewUserImageCommandHandler(
            mockUserRepositoryPort,
            mockUserStoragePort
        );
        (reviewUserImageHandler as any).dataSource = mockDataSource;
    });

    it('존재하지 않는 사용자인 경우 NotFoundException을 던진다', async () => {
        // Given
        mockUserRepositoryPort.selectUserFromIdWithProfiles.mockResolvedValue(null);

        // When & Then
        await expect(
            reviewUserImageHandler.execute(new ReviewUserImageCommand(userId, profilePath, true))
        ).rejects.toThrow(NotFoundException);
    });

    it('존재하지 않는 이미지 경로인 경우 NotFoundException을 던진다', async () => {
        // Given
        const mockProfile = UserProfileEntity.of({
            path: 'different-path',
            active: false
        }, { userId, no: 1 }).setPersistence({ userId, no: 1 }, new Date(), new Date());

        const mockUser = UserEntity.of({
            name: 'test',
            nickname: 'test',
            gender: UserGender.MALE,
            birthDate: new Date(),
            region: UserRegion.SEOUL,
            status: UserStatus.ACTIVE,
            profiles: [mockProfile]
        }).setPersistence(userId, new Date(), new Date());

        mockUserRepositoryPort.selectUserFromIdWithProfiles.mockResolvedValue(mockUser);

        // When & Then
        await expect(
            reviewUserImageHandler.execute(new ReviewUserImageCommand(userId, profilePath, true))
        ).rejects.toThrow(NotFoundException);
    });

    it('이미 활성화된 이미지인 경우 ConflictException을 던진다', async () => {
        // Given
        const mockProfile = UserProfileEntity.of({
            path: profilePath,
            active: true
        }, { userId, no: profileNo }).setPersistence({ userId, no: profileNo }, new Date(), new Date());

        const mockUser = UserEntity.of({
            name: 'test',
            nickname: 'test',
            gender: UserGender.MALE,
            birthDate: new Date(),
            region: UserRegion.SEOUL,
            status: UserStatus.ACTIVE,
            profiles: [mockProfile]
        }).setPersistence(userId, new Date(), new Date());

        mockUserRepositoryPort.selectUserFromIdWithProfiles.mockResolvedValue(mockUser);

        // When & Then
        await expect(
            reviewUserImageHandler.execute(new ReviewUserImageCommand(userId, profilePath, true))
        ).rejects.toThrow(ConflictException);
    });

    it('이미지 메타데이터가 존재하지 않는 경우 NotFoundException을 던진다', async () => {
        // Given
        const mockProfile = UserProfileEntity.of({
            path: profilePath,
            active: false
        }, { userId, no: profileNo }).setPersistence({ userId, no: profileNo }, new Date(), new Date());

        const mockUser = UserEntity.of({
            name: 'test',
            nickname: 'test',
            gender: UserGender.MALE,
            birthDate: new Date(),
            region: UserRegion.SEOUL,
            status: UserStatus.ACTIVE,
            profiles: [mockProfile]
        }).setPersistence(userId, new Date(), new Date());

        mockUserRepositoryPort.selectUserFromIdWithProfiles.mockResolvedValue(mockUser);
        mockUserStoragePort.hasMetadata.mockResolvedValue(false);

        // When & Then
        await expect(
            reviewUserImageHandler.execute(new ReviewUserImageCommand(userId, profilePath, true))
        ).rejects.toThrow(NotFoundException);

        expect(mockUserStoragePort.hasMetadata).toHaveBeenCalledWith(userId, profileNo);
    });

    it('승인(approve=true)인 경우 이미지를 활성화한다', async () => {
        // Given
        const mockProfile = UserProfileEntity.of({
            path: profilePath,
            active: false
        }, { userId, no: profileNo }).setPersistence({ userId, no: profileNo }, new Date(), new Date());

        const mockUser = UserEntity.of({
            name: 'test',
            nickname: 'test',
            gender: UserGender.MALE,
            birthDate: new Date(),
            region: UserRegion.SEOUL,
            status: UserStatus.ACTIVE,
            profiles: [mockProfile]
        }).setPersistence(userId, new Date(), new Date());

        mockUserRepositoryPort.selectUserFromIdWithProfiles.mockResolvedValue(mockUser);
        mockUserStoragePort.hasMetadata.mockResolvedValue(true);

        // When
        await reviewUserImageHandler.execute(new ReviewUserImageCommand(userId, profilePath, true));

        // Then
        expect(mockUserRepositoryPort.updateUserAttachmentActive).toHaveBeenCalledWith(userId, profileNo, true);
        expect(mockUserRepositoryPort.deleteUserAttachment).not.toHaveBeenCalled();
        expect(mockUserStoragePort.deleteProfileImage).not.toHaveBeenCalled();
    });

    it('거부(approve=false)인 경우 이미지를 삭제한다', async () => {
        // Given
        const mockProfile = UserProfileEntity.of({
            path: profilePath,
            active: false
        }, { userId, no: profileNo }).setPersistence({ userId, no: profileNo }, new Date(), new Date());

        const mockUser = UserEntity.of({
            name: 'test',
            nickname: 'test',
            gender: UserGender.MALE,
            birthDate: new Date(),
            region: UserRegion.SEOUL,
            status: UserStatus.ACTIVE,
            profiles: [mockProfile]
        }).setPersistence(userId, new Date(), new Date());

        mockUserRepositoryPort.selectUserFromIdWithProfiles.mockResolvedValue(mockUser);
        mockUserStoragePort.hasMetadata.mockResolvedValue(true);

        // When
        await reviewUserImageHandler.execute(new ReviewUserImageCommand(userId, profilePath, false));

        // Then
        expect(mockUserRepositoryPort.deleteUserAttachment).toHaveBeenCalledWith(userId, profileNo);
        expect(mockUserStoragePort.deleteProfileImage).toHaveBeenCalledWith(userId, profileNo);
        expect(mockUserRepositoryPort.updateUserAttachmentActive).not.toHaveBeenCalled();
    });
});
