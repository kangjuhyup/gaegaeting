import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { RegisterPetCommand } from "../../port/command/register-pet.port";
import { PetEntity } from "@app/pet/domain/model/pet";
import { PetProfileRepositoryPort } from "@app/pet/infrastructure/port/pet-profile-repository.port";
import { PetCertificationPort } from "@app/pet/infrastructure/port/pet-certification.port";
import { Transactional } from "@core/database";

@CommandHandler(RegisterPetCommand)
export class RegisterPetHandler implements ICommandHandler<RegisterPetCommand,PetEntity> {

    constructor(
        private readonly petProfileRepository : PetProfileRepositoryPort,
        private readonly petCeritifcationPort : PetCertificationPort
    ) {}
    @Transactional()
    async execute(command: RegisterPetCommand): Promise<PetEntity> {
        if(command.pet.certificationCode){
            const isCertificated = await this.petCeritifcationPort.checkCertifiaction(command.user.name, command.pet.certificationCode);
            if(!isCertificated){
                throw new Error('등록번호와 등록증명이 일치하지 않습니다.');
            }
            command.pet.successCert();
        }
        return await this.petProfileRepository.insertPet(command.pet);
    }
}