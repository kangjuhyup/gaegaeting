import { Pet } from "../model/vo/pet";

export abstract class PetApiPort {

    abstract getPetsFromUser(userId:string) : Promise<Pet[]>
}