import { RegisterPetHandler } from '@app/pet/application/service/command/register-pet.command';
import { RegisterPetCommand } from '@app/pet/application/port/command/register-pet.port';
import { PetProfileRepositoryPort } from '@app/pet/infrastructure/port/pet-profile-repository.port';
import { PetBreed, PetGender, PetPersonality, PetSize } from '@app/pet/domain/enum/pet.enum';
import { PetProfileEntity } from '@app/pet/domain/model/pet-profile';

describe('RegisterPetHandler (UNIT)', () => {
  let handler: RegisterPetHandler;
  let petProfileRepository: jest.Mocked<PetProfileRepositoryPort>;

  const user = { userId: 'user-1', name: 'tester' } as any;

  beforeEach(() => {
    petProfileRepository = {
      insertPet: jest.fn(),
      selectPetFromId: jest.fn(),
      selectPetFromUserId: jest.fn(),
      selectPetsFromUserIds: jest.fn(),
      updatePet: jest.fn(),
      deletePet: jest.fn(),
    } as unknown as jest.Mocked<PetProfileRepositoryPort>;

    handler = new RegisterPetHandler(petProfileRepository);
  });

  it('insertPet을 호출하고 저장된 pet을 반환한다', async () => {
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
    } as any);

    petProfileRepository.insertPet.mockResolvedValue(pet);

    const result = await handler.execute(new RegisterPetCommand(user, pet));

    expect(petProfileRepository.insertPet).toHaveBeenCalledTimes(1);
    expect(result).toBe(pet);
    expect(petProfileRepository.insertPet).toHaveBeenCalledWith(pet);
  });
});


