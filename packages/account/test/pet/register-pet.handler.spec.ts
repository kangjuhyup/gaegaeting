import { jest } from '@jest/globals';
import { RegisterPetHandler } from '#app/pet/application/service/command/register-pet.command';
import { RegisterPetCommand } from '#app/pet/application/port/command/register-pet.port';
import { PetProfileRepositoryPort } from '#app/pet/infrastructure/port/pet-profile-repository.port';
import { PetProfileEntity } from '#app/pet/domain/model/pet-profile';
import { PetBreed, PetGender, PetPersonality, PetSize } from '#app/pet/domain/enum/pet.enum';
import { bindTransactionBoundaryForTest } from '@core/database/testing';

describe('RegisterPetHandler (UNIT)', () => {
  let handler: RegisterPetHandler;
  let petProfileRepository: jest.Mocked<PetProfileRepositoryPort>;

  const user = { userId: 'user-1', name: 'tester' } as any;

  beforeEach(() => {
    petProfileRepository = {
      insertPet: jest.fn(),
      selectPetFromId: jest.fn(),
      selectPetFromUserId: jest.fn(),
      updatePet: jest.fn(),
      deletePet: jest.fn(),
    } as unknown as jest.Mocked<PetProfileRepositoryPort>;

    handler = new RegisterPetHandler(petProfileRepository);
    bindTransactionBoundaryForTest(handler, {
      owner: 'test',
      run: work => work(),
    });
  });

  it('반려동물 프로필을 트랜잭션 안에서 저장한다', async () => {
    const pet = PetProfileEntity.of({
      name: 'coco',
      age: 3,
      gender: PetGender.MALE,
      breed: PetBreed.MALTESE,
      size: PetSize.SMALL,
      personalities: [PetPersonality.FRIENDLY],
      description: 'desc',
      userId: user.userId,
      certification: false,
      certificationCode: 'CODE',
    } as any);

    petProfileRepository.insertPet.mockResolvedValue(pet);

    const result = await handler.execute(new RegisterPetCommand(user, pet));

    expect(result).toBe(pet);
    expect(petProfileRepository.insertPet).toHaveBeenCalledWith(pet);
  });
});
