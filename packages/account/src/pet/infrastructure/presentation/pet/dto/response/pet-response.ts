import { PetEntity } from "@app/pet/domain/model/pet"

export class PetResponse {
    private readonly userId : string
    private readonly pets : Pet[]

    constructor(
        userId:string,
        pets: Pet[]
    ) {
        this.userId = userId;
        this.pets = pets;
    }

    static of(
        userId : string,
        pets : PetEntity[]
    ) {
        return new PetResponse(userId, pets.map(Pet.fromDomain))
    }
}

class Pet {
    private readonly id : number
    private readonly name : string
    private readonly age : number
    private readonly gender : string
    private readonly breed : string
    private readonly size : string
    private readonly personalities : string[]
    private readonly description : string

    constructor(
        id : number,
        name : string,
        age : number,
        gender : string,
        breed : string,
        size : string,
        personalities : string[],
        description : string
    ) {
        this.id = id;
        this.name = name;
        this.age = age;
        this.gender = gender;
        this.breed = breed;
        this.size = size;
        this.personalities = personalities;
        this.description = description;
    }

    static fromDomain(pet:PetEntity) {
        return new Pet(pet.id, pet.name, pet.age, pet.gender.label, pet.breed.label, pet.size.label, pet.personalities.map((p) => p.label), pet.description)
    }
}