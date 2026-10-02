import { jest } from '@jest/globals';
import { GetUserProfileHandler } from '#app/user/application/service/query/get-user-profile.query';
import { GetUserProfileQuery } from '#app/user/application/port/query/get-user-profile.port';
import { UserProfileEntity } from '#app/user/domain/model/user-profile';

describe('Public profile photos', () => {
  test('a missing profile returns null without reading photos', async () => {
    const users = { selectUserProfileFromId: jest.fn(async () => null) };
    const images = { approvedUrls: jest.fn(async () => []) };
    const handler = new GetUserProfileHandler(users as any, images as any);
    await expect(handler.execute(new GetUserProfileQuery('user-1'))).resolves.toEqual({ profile: null, profileImages: [] });
    expect(images.approvedUrls).not.toHaveBeenCalled();
  });
  test('profile readers receive signed approved photo URLs only', async () => {
    const profile = UserProfileEntity.of({} as any, 'user-1');
    const users = { selectUserProfileFromId: jest.fn(async () => profile) };
    const images = { approvedUrls: jest.fn(async () => ['https://storage.test/approved-photo']) };
    const handler = new GetUserProfileHandler(users as any, images as any);
    const result = await handler.execute(new GetUserProfileQuery('user-1'));
    expect(result.profile).toBe(profile);
    expect(result.profileImages.map(image => ({ active: image.active, path: image.path }))).toEqual([{ active: true, path: 'https://storage.test/approved-photo' }]);
    expect(images.approvedUrls).toHaveBeenCalledWith('USER', 'user-1');
  });
});
