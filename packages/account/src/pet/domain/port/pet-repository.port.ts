import { PetEntity } from "../model/pet";
import { PetProfileEntity } from "../model/pet-profile";

export abstract class PetRepositoryPort {
    abstract insertPet(pet : PetEntity) : Promise<PetEntity>
    abstract selectPetFromId(id : number) : Promise<PetEntity>
    abstract selectPetFromUserId(userId : string) : Promise<PetEntity[]>
    abstract updatePet(pet : PetEntity) : Promise<PetEntity>
    abstract deletePet(id : number) : Promise<void>

    abstract insertPetAttachment(pet : PetProfileEntity) : Promise<PetProfileEntity>
}