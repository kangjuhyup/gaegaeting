import { RegisterPetHandler } from '@app/pet/application/service/command/register-pet.command';
import { RegisterPetCommand } from '@app/pet/application/port/command/register-pet.port';
import { PetProfileRepositoryPort } from '@app/pet/infrastructure/port/pet-profile-repository.port';
import { PetCertificationPort } from '@app/pet/infrastructure/port/pet-certification.port';
import { PetEntity } from '@app/pet/domain/model/pet';
import { PetBreed, PetGender, PetPersonality, PetSize } from '@app/pet/domain/enum/pet.enum';

describe('RegisterPetHandler (UNIT)', () => {
  let handler: RegisterPetHandler;
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

    handler = new RegisterPetHandler(petProfileRepository, petCertificationPort);
  });

  it('인증코드가 있고 인증 실패면 에러를 던진다', async () => {
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
      certificationCode: 'CODE',
    } as any);

    petCertificationPort.checkCertifiaction.mockResolvedValue(false);

    await expect(handler.execute(new RegisterPetCommand(user, pet))).rejects.toThrow(
      '등록번호와 등록증명이 일치하지 않습니다.',
    );
    expect(petProfileRepository.insertPet).not.toHaveBeenCalled();
  });

  it('인증 성공이면 successCert 후 저장한다', async () => {
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
      certificationCode: 'CODE',
    } as any);

    petCertificationPort.checkCertifiaction.mockResolvedValue(true);
    petProfileRepository.insertPet.mockResolvedValue(pet);

    const result = await handler.execute(new RegisterPetCommand(user, pet));

    expect(petCertificationPort.checkCertifiaction).toHaveBeenCalledWith(user.name, 'CODE');
    expect(result).toBe(pet);
    expect(pet.isCertificated).toBe(true);
    expect(petProfileRepository.insertPet).toHaveBeenCalledWith(pet);
  });
});


