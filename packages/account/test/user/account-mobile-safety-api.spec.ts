import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApolloFederationDriver } from '@nestjs/apollo';
import { GraphQLModule, GqlExecutionContext } from '@nestjs/graphql';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GraphqlAccessGuard } from '@core/auth';
import { UserProfileStatus } from '@core/database';
import { jest } from '@jest/globals';
import { UserResolver } from '../../src/user/infrastructure/adapter/inbound/gql/user.resolver.js';
import { PetResolver } from '../../src/pet/infrastructure/adapter/inbound/gql/pet.resolver.js';
import { AccountSignupRepositoryPort } from '../../src/user/application/port/account-signup-repository.port.js';
import { ProfileImageService } from '../../src/common/profile-images/profile-image.service.js';
import { UserProfileEntity } from '../../src/user/domain/model/user-profile.js';
import { UserGender, UserRegion } from '../../src/user/domain/enum/user.enum.js';
import { CertifyPetCommand } from '../../src/pet/application/port/command/certify-pet.port.js';
import { CertifyPetHandler } from '../../src/pet/application/service/command/certify-pet.command.js';
import { PetProfileEntity } from '../../src/pet/domain/model/pet-profile.js';
import { PetGender, PetBreed, PetSize } from '../../src/pet/domain/enum/pet.enum.js';
import { bindTransactionBoundaryForTest } from '@core/database/testing';

describe('Account mobile safety at the GraphQL boundary', () => {
  let app: INestApplication;
  let endpoint: string;
  let certify: CertifyPetHandler;
  const registry = { checkCertifiaction: jest.fn(async () => true) };
  const savePet = jest.fn(async (pet: PetProfileEntity) => pet);
  let pets: Map<number, PetProfileEntity>;
  const execute = jest.fn(async (command: any) => command instanceof CertifyPetCommand
    ? certify.execute(command) : UserProfileEntity.of({
    name: 'Test fixture', nickname: command.data.nickname,
    gender: UserGender.FEMALE, birthDate: new Date('2000-01-01'),
    region: UserRegion.SEOUL, status: UserProfileStatus.ACTIVE,
  }, command.id));

  beforeAll(async () => {
    certify = new CertifyPetHandler({
      selectPetFromId: async (id: number) => pets.get(id) ?? null, updatePet: savePet,
    } as any, registry);
    bindTransactionBoundaryForTest(certify, { owner: 'test', run: work => work() });
    const module = await Test.createTestingModule({
      imports: [GraphQLModule.forRoot({
        driver: ApolloFederationDriver, autoSchemaFile: { federation: 2 },
      })],
      providers: [UserResolver, PetResolver,
        { provide: CommandBus, useValue: { execute } },
        { provide: QueryBus, useValue: { execute: jest.fn() } },
        { provide: AccountSignupRepositoryPort, useValue: {} },
        { provide: ProfileImageService, useValue: {} },
      ],
    }).overrideGuard(GraphqlAccessGuard).useValue({
      canActivate(context: any) {
        GqlExecutionContext.create(context).getContext().req.user = {
          userId: 'actor-account', subject: 'fixture-subject', scopes: ['account:write'],
        };
        return true;
      },
    }).compile();
    app = module.createNestApplication({ logger: false });
    await app.listen(0, '127.0.0.1');
    endpoint = `${await app.getUrl()}/graphql`;
  });
  beforeEach(() => {
    pets = new Map([['actor-account', 1], ['other-account', 2]].map(([owner, id]) => [Number(id), PetProfileEntity.of({
      name: 'Fixture pet', age: 2, gender: PetGender.FEMALE, breed: PetBreed.MALTESE,
      size: PetSize.SMALL, personalities: [], description: '', userId: String(owner), certification: false,
    }, Number(id))]));
    registry.checkCertifiaction.mockResolvedValue(true);
  });
  afterEach(() => { execute.mockClear(); registry.checkCertifiaction.mockClear(); savePet.mockClear(); });
  afterAll(async () => { if (app) await app.close(); });
  async function request(query: string) {
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    return response.json();
  }
  test('actor can update their own profile with the existing public arguments', async () => {
    const result = await request('mutation { updateProfile(id:"actor-account", input:{nickname:"Updated"}) { id nickname } }');
    expect(result.errors).toBeUndefined();
    expect(result.data.updateProfile).toEqual({ id: 'actor-account', nickname: 'Updated' });
    expect(execute).toHaveBeenCalledTimes(1);
  });
  test('another account id cannot reach the write command despite account:write', async () => {
    const result = await request('mutation { updateProfile(id:"other-account", input:{nickname:"Unauthorized"}) { id } }');
    expect(result.errors[0].message).toBe('본인 프로필만 수정할 수 있습니다.');
    expect(result.data).toBeNull();
    expect(execute).not.toHaveBeenCalled();
  });
  test('unsupported pet deletion returns an error rather than a successful true', async () => {
    const result = await request('mutation { deletePet(id:123) }');
    expect(result.errors[0].message).toBe('PET_DELETION_UNAVAILABLE');
    expect(result.data).toBeNull();
    expect(execute).not.toHaveBeenCalled();
  });
  test('owner can certify their pet through the unchanged GraphQL arguments', async () => {
    const result = await request('mutation { certifyPet(id:1, input:{userName:"Fixture", certificationCode:"fixture-code"}) { id isCertificated } }');
    expect(result.errors).toBeUndefined();
    expect(result.data.certifyPet).toEqual({ id: 1, isCertificated: true });
    expect(registry.checkCertifiaction).toHaveBeenCalledTimes(1);
    expect(savePet).toHaveBeenCalledWith(pets.get(1));
  });
  test('valid registry proof cannot certify another account pet or reach the registry', async () => {
    const result = await request('mutation { certifyPet(id:2, input:{userName:"Fixture", certificationCode:"fixture-code"}) { id } }');
    expect(result.errors[0].message).toBe('본인 반려동물만 인증할 수 있습니다.');
    expect(result.data).toBeNull();
    expect(registry.checkCertifiaction).not.toHaveBeenCalled();
    expect(savePet).not.toHaveBeenCalled();
    expect(pets.get(2)?.isCertificated).toBe(false);
  });
  test('owner still needs valid registry proof before the pet can be certified', async () => {
    registry.checkCertifiaction.mockResolvedValue(false);
    const result = await request('mutation { certifyPet(id:1, input:{userName:"Fixture", certificationCode:"invalid-fixture-code"}) { id } }');
    expect(result.errors[0].message).toBe('등록번호와 등록증명이 일치하지 않습니다.');
    expect(savePet).not.toHaveBeenCalled();
    expect(pets.get(1)?.isCertificated).toBe(false);
  });
});
