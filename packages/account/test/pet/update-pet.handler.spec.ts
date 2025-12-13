import { UpdatePetHandler } from '@app/pet/application/service/command/update-pet.command';
import { UpdatePetCommand } from '@app/pet/application/port/command/update-pet.port';
import { PetProfileRepositoryPort } from '@app/pet/infrastructure/port/pet-profile-repository.port';
import { PetCertificationPort } from '@app/pet/infrastructure/port/pet-certification.port';
import { PetEntity } from '@app/pet/domain/model/pet';
import { PetBreed, PetGender, PetPersonality, PetSize } from '@app/pet/domain/enum/pet.enum';

describe('UpdatePetHandler (UNIT)', () => {
  let handler: UpdatePetHandler;
  let petProfileRepository: jest.Mocked<PetProfileRepositoryPort>;
  let petCertificationPort: jest.Mocked<PetCertificationPort>;

  const user = { userId: 'user-1', name: 'tester' } as any;

  beforeEach(() => {
    petProfileRepository = {
      insertPet: jest.fn(),
      selectPetFromId: jest.fn(),
      selectPetFromUserId: jest.fn(),
      updatePet: jest.fn(),
      deletePet: jest.fn(),
    } as unknown as jest.Mocked<PetProfileRepositoryPort>;

    petCertificationPort = {
      checkCertifiaction: jest.fn(),
    } as unknown as jest.Mocked<PetCertificationPort>;

    handler = new UpdatePetHandler(petProfileRepository, petCertificationPort);
  });

  it('pet이 없으면 에러를 던진다', async () => {
    petProfileRepository.selectPetFromId.mockResolvedValue(null);

    await expect(
      handler.execute(new UpdatePetCommand(1, user, { name: 'new' } as any)),
    ).rejects.toThrow('반려동물을 찾을 수 없습니다.');
  });

  it('인증코드가 있으면 인증 후 updatePet을 호출한다', async () => {
    const pet = PetEntity.of({
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
    petCertificationPort.checkCertifiaction.mockResolvedValue(true);
    petProfileRepository.updatePet.mockResolvedValue(pet);

    const result = await handler.execute(
      new UpdatePetCommand(1, user, { certificationCode: 'CODE', name: 'coco2' } as any),
    );

    expect(petCertificationPort.checkCertifiaction).toHaveBeenCalledWith(user.name, 'CODE');
    expect(pet.isCertificated).toBe(true);
    expect(petProfileRepository.updatePet).toHaveBeenCalledWith(pet);
    expect(result).toBe(pet);
  });
});


