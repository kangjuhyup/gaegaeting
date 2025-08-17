import { GetUserPrincipalHandler } from '../get-user-principal.query';
import { GetUserPrincipalQuery } from '@app/auth/application/port/query/get-user-principal.port';
import { AuthRepositoryPort } from '@app/auth/domain/port/auth-repository.port';
import { UserPrincipal } from '@core/auth';
import { mockAuthRepositoryPort } from '../../__test__/mock';

describe('GetUserPrincipalHandler 단위 테스트', () => {
    let authRepository: jest.Mocked<AuthRepositoryPort>;
    let getUserPrincipalHandler: GetUserPrincipalHandler;

    const mockProviderType = 1; // 예시 provider type
    const mockProviderId = 'test-provider-id';
    const mockUserPrincipal: UserPrincipal = {
        name : 'test',
        userId: 'user-id-123',
        nickname: '테스트 사용자',
        birth : '2000-01-01',
        region : 0
    };

    beforeEach(() => {
        jest.clearAllMocks();
        authRepository = mockAuthRepositoryPort;
        getUserPrincipalHandler = new GetUserPrincipalHandler(authRepository);
    });

    it('사용자 정보를 성공적으로 조회해야 함', async () => {
        // Given
        authRepository.findUserByAuthProvider.mockResolvedValue(mockUserPrincipal);
        const query = new GetUserPrincipalQuery(mockProviderType, mockProviderId);

        // When
        const result = await getUserPrincipalHandler.execute(query);

        // Then
        expect(authRepository.findUserByAuthProvider).toHaveBeenCalledWith(mockProviderType, mockProviderId);
        expect(result).toEqual(mockUserPrincipal);
    });

    it('사용자 정보가 없을 경우 null을 반환해야 함', async () => {
        // Given
        authRepository.findUserByAuthProvider.mockResolvedValue(null);
        const query = new GetUserPrincipalQuery(mockProviderType, mockProviderId);

        // When
        const result = await getUserPrincipalHandler.execute(query);

        // Then
        expect(authRepository.findUserByAuthProvider).toHaveBeenCalledWith(mockProviderType, mockProviderId);
        expect(result).toBeNull();
    });

    it('에러 발생 시 예외를 전파해야 함', async () => {
        // Given
        const errorMessage = '사용자 정보 조회 중 오류 발생';
        authRepository.findUserByAuthProvider.mockRejectedValue(new Error(errorMessage));
        const query = new GetUserPrincipalQuery(mockProviderType, mockProviderId);

        // When & Then
        await expect(getUserPrincipalHandler.execute(query)).rejects.toThrow(errorMessage);
        expect(authRepository.findUserByAuthProvider).toHaveBeenCalledWith(mockProviderType, mockProviderId);
    });
});
