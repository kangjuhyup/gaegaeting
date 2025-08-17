import { UpdatePetHandler } from '../update-pet.command';
import { UpdatePetCommand } from '../../../port/in/command/update-pet.port';
import { PetEntity } from '@app/pet/domain/model/pet';
import { UserPrincipal } from '@core/auth';
import { PetBreed, PetGender, PetPersonality, PetSize } from '@app/pet/domain/enum/pet.enum';
import { mockPetRepositoryPort, mockPetCertificationPort } from '../../__test__/mock';

describe('UpdatePetHandler', () => {
  let handler: UpdatePetHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 핸들러 생성
    handler = new UpdatePetHandler(mockPetRepositoryPort, mockPetCertificationPort);
  });

  it('반려동물 정보를 성공적으로 업데이트해야 함', async () => {
    // Given
    const petId = 1;
    const mockUser: UserPrincipal = {
      userId: 'user-123',
      name: '홍길동',
      nickname: '길동이',
      birth: '1990-01-01',
      region: 1,
    };

    const existingPet = PetEntity.of({
      name: '멍멍이',
      age: 3,
      gender: PetGender.MALE,
      breed: PetBreed.MALTESE,
      size: PetSize.SMALL,
      personalities: [PetPersonality.ACTIVE],
      description: '활발한 강아지입니다',
      userId: 'user-123',
      certification: false,
    });

    const updateData = {
      name: '멍멍이2',
      age: 4,
      description: '더 활발해진 강아지입니다',
    };

    mockPetRepositoryPort.selectPetFromId.mockResolvedValue(existingPet);
    mockPetRepositoryPort.updatePet.mockResolvedValue(existingPet);

    // When
    const command = new UpdatePetCommand(petId, mockUser, updateData);
    const result = await handler.execute(command);

    // Then
    expect(mockPetRepositoryPort.selectPetFromId).toHaveBeenCalledWith(petId);
    expect(mockPetRepositoryPort.updatePet).toHaveBeenCalledWith(existingPet);
    expect(result.name).toBe(updateData.name);
    expect(result.age).toBe(updateData.age);
    expect(result.description).toBe(updateData.description);
  });

  it('인증서 코드가 있고 검증에 성공하면 인증 상태를 true로 설정해야 함', async () => {
    // Given
    const petId = 1;
    const mockUser: UserPrincipal = {
      userId: 'user-123',
      name: '홍길동',
      nickname: '길동이',
      birth: '1990-01-01',
      region: 1,
    };

    const existingPet = PetEntity.of({
      name: '멍멍이',
      age: 3,
      gender: PetGender.MALE,
      breed: PetBreed.MALTESE,
      size: PetSize.SMALL,
      personalities: [PetPersonality.ACTIVE],
      description: '활발한 강아지입니다',
      userId: 'user-123',
      certification: false,
    });

    const updateData = {
      name: '멍멍이2',
      certificationCode: 'CERT-123',
    };

    mockPetRepositoryPort.selectPetFromId.mockResolvedValue(existingPet);
    mockPetCertificationPort.checkCertifiaction.mockResolvedValue(true);
    mockPetRepositoryPort.updatePet.mockResolvedValue(existingPet);

    // When
    const command = new UpdatePetCommand(petId, mockUser, updateData);
    const result = await handler.execute(command);

    // Then
    expect(mockPetCertificationPort.checkCertifiaction).toHaveBeenCalledWith('홍길동', 'CERT-123');
    expect(mockPetRepositoryPort.updatePet).toHaveBeenCalledWith(existingPet);
    expect(result.isCertificated).toBe(true);
  });

  it('인증서 코드가 있지만 검증에 실패하면 에러를 발생시켜야 함', async () => {
    // Given
    const petId = 1;
    const mockUser: UserPrincipal = {
      userId: 'user-123',
      name: '홍길동',
      nickname: '길동이',
      birth: '1990-01-01',
      region: 1,
    };

    const existingPet = PetEntity.of({
      name: '멍멍이',
      age: 3,
      gender: PetGender.MALE,
      breed: PetBreed.MALTESE,
      size: PetSize.SMALL,
      personalities: [PetPersonality.ACTIVE],
      description: '활발한 강아지입니다',
      userId: 'user-123',
      certification: false,
    });

    const updateData = {
      name: '멍멍이2',
      certificationCode: 'INVALID-CERT',
    };

    mockPetRepositoryPort.selectPetFromId.mockResolvedValue(existingPet);
    mockPetCertificationPort.checkCertifiaction.mockResolvedValue(false);

    // When & Then
    const command = new UpdatePetCommand(petId, mockUser, updateData);
    await expect(handler.execute(command)).rejects.toThrow('등록번호와 등록증명이 일치하지 않습니다.');
    
    expect(mockPetCertificationPort.checkCertifiaction).toHaveBeenCalledWith('홍길동', 'INVALID-CERT');
    expect(mockPetRepositoryPort.updatePet).not.toHaveBeenCalled();
  });

  it('존재하지 않는 반려동물 ID로 요청하면 에러를 발생시켜야 함', async () => {
    // Given
    const petId = 999;
    const mockUser: UserPrincipal = {
      userId: 'user-123',
      name: '홍길동',
      nickname: '길동이',
      birth: '1990-01-01',
      region: 1,
    };

    const updateData = {
      name: '멍멍이2',
    };

    mockPetRepositoryPort.selectPetFromId.mockResolvedValue(null);

    // When & Then
    const command = new UpdatePetCommand(petId, mockUser, updateData);
    await expect(handler.execute(command)).rejects.toThrow('반려동물을 찾을 수 없습니다.');
    
    expect(mockPetRepositoryPort.selectPetFromId).toHaveBeenCalledWith(petId);
    expect(mockPetRepositoryPort.updatePet).not.toHaveBeenCalled();
  });
});
