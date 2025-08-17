import { DeleteProfileImageHandler } from '../delete-profile-image.command';
import { DeleteProfileImageCommand } from '@app/user/application/port/command/delete-profile-image.port';
import { NotFoundException } from '@nestjs/common';
import { UserProfileEntity } from '@app/user/domain/model/user-profile';
import { mockUserRepositoryPort, mockUserStoragePort } from '../../__test__/mock';

describe('DeleteProfileImageHandler 단위 테스트', () => {
    let deleteProfileImageHandler: DeleteProfileImageHandler;
    const userId = 'test-user-id';
    const profileNo = 1;
    
    beforeEach(() => {
        // 모의 객체 초기화 및 핸들러 생성
        jest.clearAllMocks();
        deleteProfileImageHandler = new DeleteProfileImageHandler(
            mockUserRepositoryPort,
            mockUserStoragePort
        );
    });
    
    it('존재하지 않는 프로필 이미지인 경우 NotFoundException을 던진다', async () => {
        // Given
        mockUserRepositoryPort.selectUserAttachment.mockResolvedValue(null);
        
        // When & Then
        await expect(
            deleteProfileImageHandler.execute(new DeleteProfileImageCommand(userId, profileNo))
        ).rejects.toThrow(NotFoundException);
        
        // 저장소 메서드가 호출되지 않았는지 확인
        expect(mockUserRepositoryPort.deleteUserAttachment).not.toHaveBeenCalled();
        expect(mockUserStoragePort.deleteProfileImage).not.toHaveBeenCalled();
    });
    
    it('존재하는 프로필 이미지인 경우 성공적으로 삭제한다', async () => {
        // Given
        const mockProfile = UserProfileEntity.of({
            path: 'test-path',
            active: true
        });
        mockUserRepositoryPort.selectUserAttachment.mockResolvedValue(mockProfile);
        
        // When
        await deleteProfileImageHandler.execute(new DeleteProfileImageCommand(userId, profileNo));
        
        // Then
        expect(mockUserRepositoryPort.deleteUserAttachment).toHaveBeenCalledWith(userId, profileNo);
        expect(mockUserStoragePort.deleteProfileImage).toHaveBeenCalledWith(userId, profileNo);
    });
});
