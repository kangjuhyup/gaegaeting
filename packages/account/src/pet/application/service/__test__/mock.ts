import { PetRepositoryPort } from "@app/pet/domain/port/out/pet-repository.port";
import { PetStoragePort } from "@app/pet/domain/port/out/pet-storage.port";

export const mockPetStoragePort = {
    getPresignedUrl : jest.fn(),
    deletePetImage : jest.fn(),
    hasMetadata : jest.fn()
} as jest.Mocked<PetStoragePort>

export const mockPetRepositoryPort = {
    insertPetAttachment : jest.fn(),
    insertPet : jest.fn(),
    selectPetFromId : jest.fn(),
    selectPetFromUserId : jest.fn(),
    updatePet : jest.fn(),
    deletePet : jest.fn()
} as jest.Mocked<PetRepositoryPort>