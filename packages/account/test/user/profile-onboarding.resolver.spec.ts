import { jest } from '@jest/globals';
import { UserResolver } from '../../src/user/infrastructure/adapter/inbound/gql/user.resolver.js';
import { UserGenderGql, UserRegionGql } from '../../src/user/infrastructure/adapter/inbound/gql/dto/user.enum.js';
import { UserProfileEntity } from '../../src/user/domain/model/user-profile.js';

describe('Profile onboarding after signup', () => {
  const identity = { name: '가입 이름', birthDate: new Date('1996-05-14T00:00:00Z'), gender: 'FEMALE' as const, phone: '01012345678' };
  const user = { userId: 'signed-in-user' } as any;
  const input = { nickname: '산책 친구', region: UserRegionGql.SEOUL, bio: '같이 산책해요.' };

  function setup(savedIdentity: typeof identity | null = identity) {
    const signups = { findIdentity: jest.fn(async () => savedIdentity) };
    const commands = { execute: jest.fn(async (command: any) => UserProfileEntity.of(command.data, command.user.userId)) };
    const queries = { execute: jest.fn(async () => ({ profile: null, profileImages: [] })) };
    const resolver = new UserResolver(queries as any, commands as any, signups as any);
    return { resolver, signups, commands };
  }

  test('after a fresh login, nickname, region and bio are sufficient to create a profile with signup identity', async () => {
    const { resolver, signups } = setup();
    const result = await resolver.createProfile(user, input);
    expect(signups.findIdentity).toHaveBeenCalledWith(user.userId);
    expect(result).toMatchObject({ id: user.userId, ...input, name: identity.name, birthDate: identity.birthDate, gender: identity.gender });
  });

  test('client-supplied profile identity cannot override the signed-in account signup identity', async () => {
    const { resolver } = setup();
    const result = await resolver.createProfile(user, { ...input, name: '다른 이름', gender: UserGenderGql.MALE, birthDate: new Date('2000-01-01') });
    expect(result).toMatchObject({ name: identity.name, gender: identity.gender, birthDate: identity.birthDate });
  });

  test('legacy accounts with no saved identity receive an explicit error rather than fabricated personal information', async () => {
    const { resolver, commands } = setup(null);
    await expect(resolver.createProfile(user, input)).rejects.toThrow('가입 시 저장된 본인 정보가 없습니다');
    expect(commands.execute).not.toHaveBeenCalled();
  });

  test('legacy clients supplying all identity fields remain compatible for legacy accounts', async () => {
    const { resolver } = setup(null);
    await expect(resolver.createProfile(user, { ...input, name: '기존 사용자', gender: UserGenderGql.MALE, birthDate: new Date('1990-01-01') })).resolves.toMatchObject({ nickname: input.nickname, name: '기존 사용자' });
  });

  test('an authenticated new account has no profile until onboarding, without an internal server error', async () => {
    const { resolver } = setup();
    await expect(resolver.myProfile(user)).resolves.toBeNull();
    await expect(resolver.profile(user.userId)).resolves.toBeNull();
  });
});
