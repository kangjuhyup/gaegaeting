import { CreateUserProfileHandler } from '@app/user/application/service/command/create-user-profile.command';
import { CreateUserProfileCommand } from '@app/user/application/port/command/create-user-profile.port';
import { UserProfileRepositoryPort } from '@app/user/infrastructure/port/user-profile-repository.port';
import { UserProfileEntity } from '@app/user/domain/model/user-profile';
import { UserGender, UserRegion } from '@app/user/domain/enum/user.enum';
import { UserProfileStatus } from '@core/database';
import { DataSource } from 'typeorm';

describe('CreateUserProfileHandler (UNIT)', () => {
  let handler: CreateUserProfileHandler;
  let userProfileRepository: jest.Mocked<UserProfileRepositoryPort>;
  let dataSource: jest.Mocked<DataSource>;

  const user = { userId: 'user-1', name: 'tester' } as any;

  beforeEach(() => {
    userProfileRepository = {
      insertUserProfile: jest.fn(),
      selectUserProfileFromId: jest.fn(),
      updateUserProfile: jest.fn(),
      hardDeleteUser: jest.fn(),
    } as unknown as jest.Mocked<UserProfileRepositoryPort>;

    dataSource = {
      transaction: jest.fn(async (cb: any) => cb({} as any)),
    } as any;

    handler = new CreateUserProfileHandler(userProfileRepository, dataSource);
  });

  it('이미 존재하는 사용자면 에러를 던진다', async () => {
    const input = UserProfileEntity.of({
      name: '홍길동',
      nickname: '길동',
      gender: UserGender.MALE,
      birthDate: new Date('2000-01-01'),
      region: UserRegion.SEOUL,
      bio: 'bio',
      status: UserProfileStatus.ACTIVE,
    });
    userProfileRepository.selectUserProfileFromId.mockResolvedValue(input);

    await expect(handler.execute(new CreateUserProfileCommand(user, input))).rejects.toThrow(
      '이미 존재하는 사용자입니다.',
    );
    expect(userProfileRepository.insertUserProfile).not.toHaveBeenCalled();
  });

  it('존재하지 않으면 사용자 프로필을 저장하고 반환한다', async () => {
    const input = UserProfileEntity.of({
      name: '홍길동',
      nickname: '길동',
      gender: UserGender.MALE,
      birthDate: new Date('2000-01-01'),
      region: UserRegion.SEOUL,
      bio: 'bio',
      status: UserProfileStatus.ACTIVE,
    });
    const saved = UserProfileEntity.of(
      {
        name: input.name,
        nickname: input.nickname,
        gender: input.gender,
        birthDate: input.birthDate,
        region: input.region,
        bio: input.bio,
        status: input.status,
      },
      user.userId,
    );

    userProfileRepository.selectUserProfileFromId.mockResolvedValue(null);
    userProfileRepository.insertUserProfile.mockResolvedValue(saved);

    const result = await handler.execute(new CreateUserProfileCommand(user, input));

    expect(userProfileRepository.selectUserProfileFromId).toHaveBeenCalledWith(user.userId);
    expect(userProfileRepository.insertUserProfile).toHaveBeenCalledTimes(1);
    expect(result).toBe(saved);
  });
});


