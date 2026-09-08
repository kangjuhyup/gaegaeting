import { Pet } from "../model/vo/pet.js";

export abstract class PetApiPort {

    abstract getPetsFromUser(userId:string) : Promise<Pet[]>
}