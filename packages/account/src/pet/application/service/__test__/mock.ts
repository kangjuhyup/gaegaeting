import { PetProfileRepositoryPort } from "@app/pet/infrastructure/port/pet-profile-repository.port";
import { PetAttachmentRepositoryPort } from "@app/pet/infrastructure/port/pet-attachment-repository.port";
import { PetStoragePort } from "@app/pet/infrastructure/port/pet-storage.port";
import { PetCertificationPort } from "@app/pet/infrastructure/port/pet-certification.port";

export const mockPetStoragePort = {
    getPresignedUrl : jest.fn(),
    deletePetImage : jest.fn(),
    hasMetadata : jest.fn()
} as jest.Mocked<PetStoragePort>

export const mockPetProfileRepositoryPort = {
    insertPet : jest.fn(),
    selectPetFromId : jest.fn(),
    selectPetFromUserId : jest.fn(),
    updatePet : jest.fn(),
    deletePet : jest.fn()
} as jest.Mocked<PetProfileRepositoryPort>

export const mockPetAttachmentRepositoryPort = {
    insertPetAttachment : jest.fn()
} as jest.Mocked<PetAttachmentRepositoryPort>

// 기존 코드 호환성을 위한 통합 mock
export const mockPetRepositoryPort = {
    insertPetAttachment : jest.fn(),
    insertPet : jest.fn(),
    selectPetFromId : jest.fn(),
    selectPetFromUserId : jest.fn(),
    updatePet : jest.fn(),
    deletePet : jest.fn()
} as jest.Mocked<PetProfileRepositoryPort & PetAttachmentRepositoryPort>

export const mockPetCertificationPort = {
    checkCertifiaction : jest.fn()
} as jest.Mocked<PetCertificationPort>