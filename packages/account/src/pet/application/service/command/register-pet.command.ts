import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { RegisterPetCommand } from "../../port/in/command/register-pet.port";
import { PetEntity } from "@app/pet/domain/model/pet";
import { PetRepositoryPort } from "@app/pet/domain/port/out/pet-repository.port";
import { PetCertificationPort } from "@app/pet/domain/port/out/pet-certification.port";

@CommandHandler(RegisterPetCommand)
export class RegisterPetHandler implements ICommandHandler<RegisterPetCommand,PetEntity> {

    constructor(
        private readonly petRepository : PetRepositoryPort,
        private readonly petCeritifcationPort : PetCertificationPort
    ) {}
    async execute(command: RegisterPetCommand): Promise<PetEntity> {
        if(command.pet.certificationCode){
            const isCertificated = await this.petCeritifcationPort.checkCertifiaction(command.user.name, command.pet.certificationCode);
            if(!isCertificated){
                throw new Error('등록번호와 등록증명이 일치하지 않습니다.');
            }
            command.pet.successCert();
        }
        return await this.petRepository.insertPet(command.pet);
    }
}