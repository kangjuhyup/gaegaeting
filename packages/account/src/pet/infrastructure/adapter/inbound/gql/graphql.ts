/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */

export enum PetGender {
    MALE = "MALE",
    FEMALE = "FEMALE"
}

export enum PetSize {
    SMALL = "SMALL",
    MEDIUM = "MEDIUM",
    LARGE = "LARGE"
}

export enum PetBreed {
    MALTESE = "MALTESE",
    POODLE = "POODLE",
    CHIHUAHUA = "CHIHUAHUA",
    POMERANIAN = "POMERANIAN",
    SHIH_TZU = "SHIH_TZU",
    YORKSHIRE = "YORKSHIRE",
    BEAGLE = "BEAGLE",
    GOLDEN_RETRIEVER = "GOLDEN_RETRIEVER",
    LABRADOR = "LABRADOR",
    HUSKY = "HUSKY",
    SAMOYED = "SAMOYED",
    WELSH_CORGI = "WELSH_CORGI",
    JINDO = "JINDO",
    MIXED = "MIXED",
    OTHER = "OTHER"
}

export enum PetPersonality {
    FRIENDLY = "FRIENDLY",
    SHY = "SHY",
    ACTIVE = "ACTIVE",
    CALM = "CALM",
    PLAYFUL = "PLAYFUL",
    PROTECTIVE = "PROTECTIVE",
    CURIOUS = "CURIOUS",
    INDEPENDENT = "INDEPENDENT"
}

export interface CreatePetInput {
    name: string;
    age: number;
    gender: PetGender;
    breed: PetBreed;
    size: PetSize;
    personalities: PetPersonality[];
    description?: Nullable<string>;
    certificationCode?: Nullable<string>;
}

export interface UpdatePetInput {
    name?: Nullable<string>;
    age?: Nullable<number>;
    personalities?: Nullable<PetPersonality[]>;
    description?: Nullable<string>;
    certificationCode?: Nullable<string>;
}

export interface Pet {
    id: number;
    name: string;
    age: number;
    gender: PetGender;
    breed: PetBreed;
    size: PetSize;
    personalities: PetPersonality[];
    description?: Nullable<string>;
    userId: string;
    isCertificated: boolean;
    profileImages: string[];
    createdAt: DateTime;
    updatedAt: DateTime;
}

export interface PresignedUrl {
    url: string;
    expiresIn: number;
}

export interface IQuery {
    pets(): Pet[] | Promise<Pet[]>;
    pet(id: number): Nullable<Pet> | Promise<Nullable<Pet>>;
    petsByUserId(userId: string): Pet[] | Promise<Pet[]>;
}

export interface IMutation {
    createPet(input: CreatePetInput): Pet | Promise<Pet>;
    updatePet(id: number, input: UpdatePetInput): Pet | Promise<Pet>;
    deletePet(id: number): boolean | Promise<boolean>;
    generatePetPresignedUrl(petId: number, imageNo: number): PresignedUrl | Promise<PresignedUrl>;
    deletePetImage(petId: number, imageNo: number): boolean | Promise<boolean>;
}

export type DateTime = any;
type Nullable<T> = T | null;

