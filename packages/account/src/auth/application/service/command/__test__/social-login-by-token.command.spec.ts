import { SocialLoginByTokenHandler } from '../social-login-by-token.command';
import { SocialLoginByTokenCommand } from '@app/auth/application/port/command/social-login-by-token.port';
import { AuthRepositoryPort } from '@app/auth/domain/port/auth-repository.port';
import { SocialAuthProviderPort } from '@app/auth/domain/port/social-auth-provider.port';
import { JwtPort } from '@app/auth/domain/port/jwt.port';
import { AuthProvider } from '@core/auth';
import { AuthToken } from '@app/auth/domain/model/auth-token';
import { AuthEntity } from '@app/auth/domain/model/auth';
import { AuthTokenService } from '../../auth-token.service';

// 목 객체 클래스
class MockUserProfile {
  constructor(private readonly providerId: string) {}
  
  getProviderId(): string {
    return this.providerId;
  }
}

describe('SocialLoginByTokenHandler 단위 테스트', () => {
  let handler: SocialLoginByTokenHandler;
  let authRepository: jest.Mocked<AuthRepositoryPort>;
  let jwtPort: jest.Mocked<JwtPort>;
  let kakaoAuthProvider: jest.Mocked<SocialAuthProviderPort>;
  let authTokenService: AuthTokenService;
  
  // 테스트 데이터
  const mockProviderId = 'test_provider_id';
  const mockAccessToken = 'test_access_token';
  const mockRefreshToken = 'test_refresh_token';
  const mockSocialAccessToken = 'kakao_access_token';
  const mockUserProfile = new MockUserProfile(mockProviderId);
  
  beforeEach(() => {
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
      getUserProfile: jest.fn().mockResolvedValue(mockUserProfile),
    } as any;
    
    // AuthTokenService 모의 객체 생성
    authTokenService = new AuthTokenService(
      authRepository,
      jwtPort
    );
    
    // 직접 의존성 주입
    handler = new SocialLoginByTokenHandler(
      authTokenService,
      [kakaoAuthProvider]
    );
  });
  
  it('소셜 토큰으로 로그인 성공 시 인증 엔티티를 반환해야 함', async () => {
    // Given
    const mockAuthToken = new AuthToken({
      accessToken: mockSocialAccessToken,
      refreshToken: 'refresh_token',
      expiresIn: 3600,
      refreshTokenExpiresIn: 604800,
      tokenType: 'Bearer'
    });
    
    const command = new SocialLoginByTokenCommand(
      AuthProvider.KAKAO,
      mockAuthToken
    );
    
    // When
    const result = await handler.execute(command);
    
    // Then
    // 1. 카카오 인증 제공자의 메서드 호출 확인
    expect(kakaoAuthProvider.getUserProfile).toHaveBeenCalledWith(mockSocialAccessToken);
    
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
    const mockAuthToken = new AuthToken({
      accessToken: mockSocialAccessToken,
      refreshToken: 'refresh_token',
      expiresIn: 3600,
      refreshTokenExpiresIn: 604800,
      tokenType: 'Bearer'
    });
    
    const command = new SocialLoginByTokenCommand(
      AuthProvider.GOOGLE, // 테스트에서는 KAKAO만 설정했으므로 GOOGLE은 지원하지 않음
      mockAuthToken
    );
    
    // When & Then
    await expect(handler.execute(command)).rejects.toThrow('GOOGLE 인증 제공자를 찾을 수 없습니다.');
  });
  
  it('인증 과정에서 오류 발생 시 적절한 에러를 발생시켜야 함', async () => {
    // Given
    const mockAuthToken = new AuthToken({
      accessToken: mockSocialAccessToken,
      refreshToken: 'refresh_token',
      expiresIn: 3600,
      refreshTokenExpiresIn: 604800,
      tokenType: 'Bearer'
    });
    
    const command = new SocialLoginByTokenCommand(
      AuthProvider.KAKAO,
      mockAuthToken
    );
    
    // 의도적으로 오류 발생시키기
    kakaoAuthProvider.getUserProfile.mockRejectedValue(new Error('사용자 프로필 조회 실패'));
    
    // When & Then
    await expect(handler.execute(command)).rejects.toThrow('토큰 로그인 처리 중 오류가 발생했습니다: 사용자 프로필 조회 실패');
  });
});
