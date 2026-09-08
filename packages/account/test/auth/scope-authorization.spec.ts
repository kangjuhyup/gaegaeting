import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UserResolver } from '#app/user/infrastructure/adapter/inbound/gql/user.resolver';
import { PetResolver } from '#app/pet/infrastructure/adapter/inbound/gql/pet.resolver';
import { AdminUserContorller } from '#app/user/infrastructure/adapter/inbound/http/user/user.admin.controller';
import { ExternalUserSubjectController } from '#app/user/infrastructure/adapter/inbound/http/user/external-user-subject.controller';

const SCOPES_KEY = 'scopes';

function handler(type: any, name: string): (...args: any[]) => any {
  return type.prototype[name];
}

describe('account operation scope policies', () => {
  test.each([
    [UserResolver, 'myProfile'],
    [UserResolver, 'profile'],
    [PetResolver, 'pets'],
    [PetResolver, 'pet'],
    [PetResolver, 'petsByUserId'],
    [AdminUserContorller, 'getUser'],
  ])('%s.%s requires account:read', (type, name) => {
    expect(Reflect.getMetadata(SCOPES_KEY, handler(type, name))).toEqual([
      'account:read',
    ]);
  });

  test.each([
    [UserResolver, 'createProfile'],
    [UserResolver, 'updateProfile'],
    [UserResolver, 'generatePresignedUrl'],
    [UserResolver, 'deleteProfileImage'],
    [PetResolver, 'createPet'],
    [PetResolver, 'updatePet'],
    [PetResolver, 'certifyPet'],
    [PetResolver, 'deletePet'],
    [PetResolver, 'generatePetPresignedUrl'],
    [PetResolver, 'deletePetImage'],
    [AdminUserContorller, 'reviewUserImage'],
  ])('%s.%s requires account:write', (type, name) => {
    expect(Reflect.getMetadata(SCOPES_KEY, handler(type, name))).toEqual([
      'account:write',
    ]);
  });

  test.each([
    [UserResolver, 'myProfile'],
    [UserResolver, 'profile'],
    [PetResolver, 'pets'],
    [PetResolver, 'pet'],
    [PetResolver, 'petsByUserId'],
  ])('%s.%s is protected by a GraphQL guard', (type, name) => {
    expect(Reflect.getMetadata(GUARDS_METADATA, handler(type, name))).toHaveLength(1);
  });

  test('keeps the Gateway-only subject resolver outside user OAuth scope policy', () => {
    expect(Reflect.getMetadata(
      SCOPES_KEY,
      handler(ExternalUserSubjectController, 'resolve'),
    )).toBeUndefined();
  });
});
