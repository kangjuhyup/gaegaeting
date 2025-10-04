import { RegisterPetHandler } from '../register-pet.command';
import { RegisterPetCommand } from '../../../port/command/register-pet.port';
import { PetEntity } from '@app/pet/domain/model/pet';
import { UserPrincipal } from '@core/auth';
import { PetBreed, PetGender, PetPersonality, PetSize } from '@app/pet/domain/enum/pet.enum';
import { mockPetRepositoryPort, mockPetCertificationPort } from '../../__test__/mock';

// Mock DataSource for @Transactional decorator
const mockDataSource = {
  transaction: jest.fn((callback) => {
    return callback({} as any);
  })
};

describe('RegisterPetHandler', () => {
  let handler: RegisterPetHandler;

  beforeEach(() => {
    jest.clearAllMocks();

    handler = new RegisterPetHandler(mockPetRepositoryPort, mockPetCertificationPort);
    (handler as any).dataSource = mockDataSource;
  });


  it('인증서 코드가 있고 검증에 성공하면 반려동물을 등록하고 인증 상태를 true로 설정해야 함', async () => {
    // Given
    const mockUser: UserPrincipal = {
      userId: 'user-123',
      name: '홍길동',
      nickname: '길동이',
      birth: '1990-01-01',
      region: 1,
    };

    const mockPet = PetEntity.of({
      name: '멍멍이',
      age: 3,
      gender: PetGender.MALE,
      breed: PetBreed.MALTESE,
      size: PetSize.SMALL,
      personalities: [PetPersonality.ACTIVE],
      description: '활발한 강아지입니다',
      userId: 'user-123',
      certificationCode: 'CERT-123',
      certification: false,
    });

    mockPetCertificationPort.checkCertifiaction.mockResolvedValue(true);
    mockPetRepositoryPort.insertPet.mockResolvedValue(mockPet);

    // When
    const command = new RegisterPetCommand(mockUser, mockPet);
    const result = await handler.execute(command);

    // Then
    expect(mockPetCertificationPort.checkCertifiaction).toHaveBeenCalledWith('홍길동', 'CERT-123');
    expect(result.isCertificated).toBe(true);
    expect(mockPetRepositoryPort.insertPet).toHaveBeenCalledWith(mockPet);
  });

  it('인증서 코드가 있지만 검증에 실패하면 에러를 발생시켜야 함', async () => {
    // Given
    const mockUser: UserPrincipal = {
      userId: 'user-123',
      name: '홍길동',
      nickname: '길동이',
      birth: '1990-01-01',
      region: 1,
    };

    const mockPet = PetEntity.of({
      name: '멍멍이',
      age: 3,
      gender: PetGender.MALE,
      breed: PetBreed.MALTESE,
      size: PetSize.SMALL,
      personalities: [PetPersonality.ACTIVE],
      description: '활발한 강아지입니다',
      userId: 'user-123',
      certificationCode: 'INVALID-CERT',
      certification: false,
    });

    // Mock 동작 설정
    mockPetCertificationPort.checkCertifiaction.mockResolvedValue(false);

    // When & Then
    const command = new RegisterPetCommand(mockUser, mockPet);
    await expect(handler.execute(command)).rejects.toThrow('등록번호와 등록증명이 일치하지 않습니다.');
    
    // 검증
    expect(mockPetCertificationPort.checkCertifiaction).toHaveBeenCalledWith('홍길동', 'INVALID-CERT');
    expect(mockPetRepositoryPort.insertPet).not.toHaveBeenCalled();
  });

  it('인증서 코드가 없으면 검증 과정 없이 반려동물을 등록해야 함', async () => {
    // Given
    const mockUser: UserPrincipal = {
      userId: 'user-123',
      name: '홍길동',
      nickname: '길동이',
      birth: '1990-01-01',
      region: 1,
    };

    const mockPet = PetEntity.of({
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

    mockPetRepositoryPort.insertPet.mockResolvedValue(mockPet);

    // When
    const command = new RegisterPetCommand(mockUser, mockPet);

    // Then
    const result = await handler.execute(command);
    expect(mockPetCertificationPort.checkCertifiaction).not.toHaveBeenCalled();
    expect(mockPetRepositoryPort.insertPet).toHaveBeenCalledWith(mockPet);
    expect(result).toBe(mockPet);
  });
});
