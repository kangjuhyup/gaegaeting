import { AuthRepositoryPort } from "@app/auth/domain/port/out/auth-repository.port";

export const mockAuthRepositoryPort = {
    saveAuth : jest.fn(),
    findUserByAuthProvider : jest.fn(),
    findByRefreshToken : jest.fn(),
    updateUserId : jest.fn()
} as jest.Mocked<AuthRepositoryPort>