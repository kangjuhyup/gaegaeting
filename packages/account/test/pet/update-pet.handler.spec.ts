import { UpdatePetHandler } from '@app/pet/application/service/command/update-pet.command';
import { UpdatePetCommand } from '@app/pet/application/port/command/update-pet.port';
import { PetProfileRepositoryPort } from '@app/pet/infrastructure/port/pet-profile-repository.port';
import { PetProfileEntity } from '@app/pet/domain/model/pet-profile';
import { PetBreed, PetGender, PetPersonality, PetSize } from '@app/pet/domain/enum/pet.enum';

describe('UpdatePetHandler (UNIT)', () => {
  let handler: UpdatePetHandler;
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

    handler = new UpdatePetHandler(petProfileRepository);
  });

  it('pet이 없으면 에러를 던진다', async () => {
    petProfileRepository.selectPetFromId.mockResolvedValue(null);

    await expect(
      handler.execute(new UpdatePetCommand(1, user, { name: 'new' } as any)),
    ).rejects.toThrow('반려동물을 찾을 수 없습니다.');
  });

  it('data에 따라 pet을 updateInfo하고 updatePet을 호출한다', async () => {
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
    (pet as any).setPersistence?.(1, new Date(), new Date());

    petProfileRepository.selectPetFromId.mockResolvedValue(pet);
    petProfileRepository.updatePet.mockResolvedValue(pet);

    const result = await handler.execute(new UpdatePetCommand(1, user, {
      name: 'coco2',
      age: 4,
      personalities: [PetPersonality.CALM],
      description: 'new-desc',
    } as any));

    expect(pet.name).toBe('coco2');
    expect(pet.age).toBe(4);
    expect(pet.personalities).toEqual([PetPersonality.CALM]);
    expect(pet.description).toBe('new-desc');
    expect(petProfileRepository.updatePet).toHaveBeenCalledWith(pet);
    expect(result).toBe(pet);
  });
});


