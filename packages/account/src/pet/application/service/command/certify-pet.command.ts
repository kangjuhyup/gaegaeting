import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Transactional } from '@core/database';
import { CertifyPetCommand } from '../../port/command/certify-pet.port';
import { PetProfileRepositoryPort } from '@app/pet/infrastructure/port/pet-profile-repository.port';
import { PetCertificationPort } from '@app/pet/infrastructure/port/pet-certification.port';
import { PetEntity } from '@app/pet/domain/model/pet';

@CommandHandler(CertifyPetCommand)
export class CertifyPetHandler
  implements ICommandHandler<CertifyPetCommand, PetEntity>
{
  constructor(
    private readonly petProfileRepository: PetProfileRepositoryPort,
    private readonly petCertificationPort: PetCertificationPort,
  ) {}

  @Transactional()
  async execute(command: CertifyPetCommand): Promise<PetEntity> {
    const pet = await this.petProfileRepository.selectPetFromId(command.petId);
    if (!pet) {
      throw new Error('반려동물을 찾을 수 없습니다.');
    }

    const userName = command.userName?.trim();
    const certificationCode = command.certificationCode?.trim();
    if (!userName || !certificationCode) {
      throw new Error('인증에 필요한 정보가 부족합니다.');
    }

    const isCertificated = await this.petCertificationPort.checkCertifiaction(
      userName,
      certificationCode,
    );
    if (!isCertificated) {
      throw new Error('등록번호와 등록증명이 일치하지 않습니다.');
    }

    // 인증 성공 처리(도메인 상태 갱신)
    pet.successCert();
    pet.updateInfo({ certificationCode } as any);

    await this.petProfileRepository.updatePet(pet);
    return pet;
  }
}


