import { GetUserProfileHandler } from '@app/user/application/service/query/get-user-profile.query';
import { GetUserProfileQuery } from '@app/user/application/port/query/get-user-profile.port';
import { UserProfileRepositoryPort } from '@app/user/infrastructure/port/user-profile-repository.port';
import { UserAttachmentRepositoryPort } from '@app/user/infrastructure/port/user-attachment-repository.port';
import { UserStoragePort } from '@app/user/infrastructure/port/user-storage.port';
import { UserProfileEntity } from '@app/user/domain/model/user-profile';
import { UserAttachmentEntity } from '@app/user/domain/model/user-attachment';

describe('GetUserProfileHandler (UNIT)', () => {
  let handler: GetUserProfileHandler;
  let userProfileRepository: jest.Mocked<UserProfileRepositoryPort>;
  let userAttachmentRepository: jest.Mocked<UserAttachmentRepositoryPort>;
  let userStoragePort: jest.Mocked<UserStoragePort>;

  beforeEach(() => {
    userProfileRepository = {
      insertUserProfile: jest.fn(),
      selectUserProfileFromId: jest.fn(),
      updateUserProfile: jest.fn(),
      hardDeleteUser: jest.fn(),
    } as unknown as jest.Mocked<UserProfileRepositoryPort>;

    userAttachmentRepository = {
      selectUserAttachment: jest.fn(),
      selectUserAttachments: jest.fn(),
      insertUserAttachment: jest.fn(),
      updateUserAttachment: jest.fn(),
      updateUserAttachmentActive: jest.fn(),
      deleteUserAttachment: jest.fn(),
    } as unknown as jest.Mocked<UserAttachmentRepositoryPort>;

    userStoragePort = {
      getPresignedUrl: jest.fn(),
      deleteProfileImage: jest.fn(),
      hasMetadata: jest.fn(),
    } as unknown as jest.Mocked<UserStoragePort>;

    handler = new GetUserProfileHandler(
      userProfileRepository,
      userAttachmentRepository,
      userStoragePort,
    );
  });

  it('메타데이터가 있는 첨부파일만 profileImages로 반환한다', async () => {
    const userId = 'user-1';
    const profile = UserProfileEntity.of({} as any, userId);

    const a1 = UserAttachmentEntity.of(
      { path: 's3://1', active: true },
      { userId, no: 1 },
    );
    const a2 = UserAttachmentEntity.of(
      { path: 's3://2', active: true },
      { userId, no: 2 },
    );

    userProfileRepository.selectUserProfileFromId.mockResolvedValue(profile);
    userAttachmentRepository.selectUserAttachments.mockResolvedValue([a1, a2]);
    userStoragePort.hasMetadata.mockImplementation(async (_uid, no) => no === 1);

    const result = await handler.execute(new GetUserProfileQuery(userId));

    expect(result.profile).toBe(profile);
    expect(result.profileImages).toEqual([a1]);
    expect(userStoragePort.hasMetadata).toHaveBeenCalledTimes(2);
  });
});


