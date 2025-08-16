import { AuthInternalApiPort } from "@app/user/domain/port/out/auth-internal-api.port";
import { UserRepositoryPort } from "@app/user/domain/port/out/user-repository.port";
import { UserStoragePort } from "@app/user/domain/port/out/user-storage.port";

export const mockUserRepositoryPort = {
            selectUserFromIdWithProfiles: jest.fn(),
            updateUserAttachmentActive: jest.fn(),
            deleteUserAttachment: jest.fn(),
            selectUserFromId: jest.fn(),
            insertUser: jest.fn(),
            selectUserFromPhone: jest.fn(),
            selectUserFromAuthProvider: jest.fn(),
            updateUser: jest.fn(),
            hardDeleteUser: jest.fn(),
            selectUserAttachment : jest.fn(),
            insertUserAttachment: jest.fn(),
            findUserAttachmentsByUserId: jest.fn()
        } as jest.Mocked<UserRepositoryPort>;
        
export const mockUserStoragePort = {
            getPresignedUrl: jest.fn(),
            deleteProfileImage: jest.fn(),
            hasMetadata: jest.fn()
        } as jest.Mocked<UserStoragePort>;

export const mockAuthInternalApiPort = {
    setUserId : jest.fn()
} as jest.Mocked<AuthInternalApiPort>