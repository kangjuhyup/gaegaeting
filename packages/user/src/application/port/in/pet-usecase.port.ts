import { PetEntity } from "@app/domain/model/pet";

export abstract class PetUsecasePort {

    abstract registerPet() : Promise<PetEntity>

    abstract getPets(userId: string) : Promise<PetEntity[]>

    abstract getPet(id:string) : Promise<PetEntity>

    abstract updatePetInfo(id:string, updatePetDto: any) : Promise<PetEntity>

    abstract registerPetPhoto(id:string, imageDto: any) : Promise<void>

    abstract deletePetPhoto(id:string, imageIndex:number) : Promise<void>

    abstract deletePet(id:string) : Promise<void>
}