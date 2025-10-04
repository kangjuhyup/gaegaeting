import { SocialLoginHandler } from '../social-login.command';
import { SocialLoginCommand } from '@app/auth/application/port/command/social-login.port';
import { AuthRepositoryPort } from '@app/auth/domain/port/auth-repository.port';
import { SocialAuthProviderPort } from '@app/auth/domain/port/social-auth-provider.port';
import { JwtPort } from '@app/auth/domain/port/jwt.port';
import { AuthProvider } from '@core/auth';
import { AuthToken } from '@app/auth/domain/model/auth-token';
import { AuthEntity } from '@app/auth/domain/model/auth';
import { AuthTokenService } from '../../auth-token.service';

// Mock DataSource for @Transactional decorator
const mockDataSource = {
  transaction: jest.fn((callback) => {
    return callback({} as any);
  })
};

// 목 객체 클래스
class MockSocialToken {
  constructor(private readonly accessToken: string) {}

  getAccessToken(): string {
    return this.accessToken;
  }
}

class MockUserProfile {
  constructor(private readonly providerId: string) {}

  getProviderId(): string {
    return this.providerId;
  }
}

describe('SocialLoginHandler 단위 테스트', () => {
  let handler: SocialLoginHandler;
  let authRepository: jest.Mocked<AuthRepositoryPort>;
  let jwtPort: jest.Mocked<JwtPort>;
  let kakaoAuthProvider: jest.Mocked<SocialAuthProviderPort>;
  let authTokenService: AuthTokenService;

  // 테스트 데이터
  const mockCode = 'test_auth_code';
  const mockState = 'test_state';
  const mockProviderId = 'test_provider_id';
  const mockAccessToken = 'test_access_token';
  const mockRefreshToken = 'test_refresh_token';
  const mockKakaoToken = new MockSocialToken('kakao_access_token');
  const mockUserProfile = new MockUserProfile(mockProviderId);

  beforeAll(() => {
    // 모의 객체 생성
    jest.clearAllMocks();

    authRepository = {
      saveAuth: jest.fn().mockResolvedValue(undefined),
    } as any;

    jwtPort = {
      createAccessToken: jest.fn().mockResolvedValue(mockAccessToken),
      createRefreshToken: jest.fn().mockResolvedValue(mockRefreshToken),
      getExpriesIn: jest.fn().mockReturnValue({
        accessToken: 3600,
        refreshToken: 604800
      }),
    } as any;

    kakaoAuthProvider = {
      getSupportedProvider: jest.fn().mockReturnValue(AuthProvider.KAKAO),
      getAccessToken: jest.fn().mockResolvedValue(mockKakaoToken),
      getUserProfile: jest.fn().mockResolvedValue(mockUserProfile),
    } as any;

    // AuthTokenService 모의 객체 생성
    authTokenService = new AuthTokenService(
      authRepository,
      jwtPort
    );

    // 직접 의존성 주입
    handler = new SocialLoginHandler(
      authTokenService,
      [kakaoAuthProvider]
    );
    (handler as any).dataSource = mockDataSource;
  });
  
  it('카카오 로그인 성공 시 인증 엔티티를 반환해야 함', async () => {
    // Given
    const command = new SocialLoginCommand(
      AuthProvider.KAKAO,
      mockCode,
      mockState
    );
    
    // When
    const result = await handler.execute(command);
    
    // Then
    // 1. 카카오 인증 제공자의 메서드 호출 확인
    expect(kakaoAuthProvider.getAccessToken).toHaveBeenCalledWith(
      mockCode,
      expect.stringContaining('/auth/kakao/callback')
    );
    expect(kakaoAuthProvider.getUserProfile).toHaveBeenCalledWith('kakao_access_token');
    
    // 2. JWT 토큰 생성 메서드 호출 확인
    expect(jwtPort.createAccessToken).toHaveBeenCalledWith({
      provider: AuthProvider.KAKAO,
      providerId: mockProviderId,
    });
    expect(jwtPort.createRefreshToken).toHaveBeenCalledWith({
      provider: AuthProvider.KAKAO,
      providerId: mockProviderId,
    });
    
    // 3. 인증 저장소 호출 확인
    expect(authRepository.saveAuth).toHaveBeenCalledWith(expect.any(AuthEntity));
    
    // 4. 반환된 인증 엔티티 확인
    expect(result).toBeInstanceOf(AuthEntity);
    expect(result.getAuthToken()).toBeInstanceOf(AuthToken);
    expect(result.getAuthToken().getAccessToken()).toBe(mockAccessToken);
    expect(result.getAuthToken().getRefreshToken()).toBe(mockRefreshToken);
    expect(result.getProvider()).toBe(AuthProvider.KAKAO);
    expect(result.getProviderId()).toBe(mockProviderId);
  });
  
  it('지원하지 않는 인증 제공자일 경우 에러를 발생시켜야 함', async () => {
    // Given
    const command = new SocialLoginCommand(
      AuthProvider.GOOGLE, // 테스트에서는 KAKAO만 설정했으므로 GOOGLE은 지원하지 않음
      mockCode,
      mockState
    );
    
    // When & Then
    await expect(handler.execute(command)).rejects.toThrow('GOOGLE 인증 제공자를 찾을 수 없습니다.');
  });
  
  it('인증 과정에서 오류 발생 시 적절한 에러를 발생시켜야 함', async () => {
    // Given
    const command = new SocialLoginCommand(
      AuthProvider.KAKAO,
      mockCode,
      mockState
    );
    
    // 의도적으로 오류 발생시키기
    kakaoAuthProvider.getAccessToken.mockRejectedValue(new Error('토큰 발급 실패'));
    
    // When & Then
    await expect(handler.execute(command)).rejects.toThrow('로그인 처리 중 오류가 발생했습니다: 토큰 발급 실패');
  });
});
