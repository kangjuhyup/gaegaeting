import { CommandHandler } from "@nestjs/cqrs";
import { UpdatePetCommand } from "../../port/command/update-pet.port";
import { PetRepositoryPort } from "@app/pet/domain/port/pet-repository.port";
import { ICommandHandler } from "@nestjs/cqrs";
import { PetEntity } from "@app/pet/domain/model/pet";
import { PetCertificationPort } from "@app/pet/domain/port/pet-certification.port";
import { Transactional } from "@core/database";

@CommandHandler(UpdatePetCommand)
export class UpdatePetHandler implements ICommandHandler<UpdatePetCommand> {
    constructor(
        private readonly petRepository: PetRepositoryPort,
        private readonly petCeritifcationPort : PetCertificationPort,
    ) {}

    @Transactional()
    async execute(command: UpdatePetCommand): Promise<PetEntity> {
        const pet = await this.petRepository.selectPetFromId(command.id);
        if (!pet) {
            throw new Error('반려동물을 찾을 수 없습니다.');
        }
        if(command.data.certificationCode) {
            const isCertificated = await this.petCeritifcationPort.checkCertifiaction(command.user.name, command.data.certificationCode);
            if(!isCertificated){
                throw new Error('등록번호와 등록증명이 일치하지 않습니다.');
            }
            pet.successCert();
        }
        pet.updateInfo(command.data)
        await this.petRepository.updatePet(pet);
        return pet;
    }
}