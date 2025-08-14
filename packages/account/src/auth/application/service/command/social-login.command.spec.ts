import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { SocialLoginHandler } from './social-login.command';
import { SocialLoginCommand } from '@app/auth/application/port/in/command/social-login.port';
import { SocialUserProfile } from '@app/auth/domain/model/auth-provider';
import { AuthToken } from '@app/auth/domain/model/auth-token';
import { SocialAuthProviderPort } from '@app/auth/domain/port/out/social-auth-provider.port';
import { AuthRepositoryPort } from '@app/auth/domain/port/out/auth-repository.port';
import { AuthProvider } from '@core/database';

/**
 * 소셜 로그인 커맨드 핸들러 테스트
 * 
 * 소셜 로그인 커맨드 핸들러의 기능을 테스트합니다.
 */
describe('SocialLoginHandler', () => {
  let handler: SocialLoginHandler;
  let jwtService: JwtService;
  let kakaoAuthProvider: SocialAuthProviderPort;
  let authRepository: AuthRepositoryPort;
  
  // 테스트용 모의 객체 생성
  const mockJwtService = {
    sign: jest.fn().mockImplementation((payload, options) => {
      if (options.expiresIn === '1h') {
        return 'mock-access-token';
      } else {
        return 'mock-refresh-token';
      }
    }),
  };
  
  const mockKakaoAuthProvider = {
    getAccessToken: jest.fn(),
    getUserProfile: jest.fn(),
    getSupportedProvider: jest.fn().mockReturnValue(AuthProvider.KAKAO),
  };
  
  const mockUserRepository = {
    createOrUpdateSocialUser: jest.fn(),
  };
  
  const mockAuthRepository = {
    saveAuth: jest.fn().mockResolvedValue('auth-uuid'),
  };
  
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialLoginHandler,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: 'SocialAuthProviders',
          useValue: [mockKakaoAuthProvider],
        },
        {
          provide: AuthRepositoryPort,
          useValue: mockAuthRepository,
        },
      ],
    }).compile();
    
    handler = module.get<SocialLoginHandler>(SocialLoginHandler);
    jwtService = module.get<JwtService>(JwtService);
    const providers = module.get<SocialAuthProviderPort[]>('SocialAuthProviders');
    kakaoAuthProvider = providers[0];
    authRepository = module.get<AuthRepositoryPort>(AuthRepositoryPort);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  /**
   * 소셜 로그인 커맨드 실행 테스트
   */
  it('카카오 로그인 커맨드가 성공적으로 처리되어야 함', async () => {
    // Given: 테스트 데이터 준비
    const command = new SocialLoginCommand(AuthProvider.KAKAO, 'test-code', 'test-state');
    
    const mockKakaoToken = new AuthToken('kakao-access-token', 'kakao-refresh-token', 3600, 3600 * 24 * 7,'Bearer');
    const mockUserProfile = new SocialUserProfile(
      AuthProvider.KAKAO,
      'kakao-user-id',
      'test@example.com',
      '테스트 사용자',
      'https://example.com/profile.jpg'
    );
    
    // Mock 설정
    mockKakaoAuthProvider.getAccessToken.mockResolvedValue(mockKakaoToken);
    mockKakaoAuthProvider.getUserProfile.mockResolvedValue(mockUserProfile);
    mockUserRepository.createOrUpdateSocialUser.mockResolvedValue('user-uuid');
    
    // When: 커맨드 실행
    const result = await handler.execute(command);
    
    // Then: 결과 검증
    expect(mockKakaoAuthProvider.getAccessToken).toHaveBeenCalledWith('test-code', expect.any(String));
    expect(mockKakaoAuthProvider.getUserProfile).toHaveBeenCalledWith('kakao-access-token');
    expect(mockUserRepository.createOrUpdateSocialUser).toHaveBeenCalledWith(mockUserProfile);
    expect(mockAuthRepository.saveAuth).toHaveBeenCalledWith('user-uuid', expect.any(Object));
    
    // JWT 토큰 생성 검증
    expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
    expect(mockJwtService.sign).toHaveBeenCalledWith(
      {
        sub: 'user-uuid',
        provider: AuthProvider.KAKAO,
        providerId: 'kakao-user-id',
        email: 'test@example.com',
        name: '테스트 사용자',
      },
      { expiresIn: '1h' }
    );
    
    // 인증 엔티티 검증
    expect(result).toBeDefined();
    expect(result.getAuthToken()).toBeDefined();
    expect(result.getAuthToken().getAccessToken()).toBe('mock-access-token');
    expect(result.getAuthToken().getRefreshToken()).toBe('mock-refresh-token');
    expect(result.getProvider()).toBe(AuthProvider.KAKAO);
    expect(result.getProviderId()).toBe('kakao-user-id');
  });
  
  /**
   * 카카오 인증 제공자가 없는 경우 오류 테스트
   */
  it('카카오 인증 제공자가 없는 경우 오류가 발생해야 함', async () => {
    // Given: 테스트 데이터 준비
    const command = new SocialLoginCommand(AuthProvider.KAKAO, 'test-code', 'test-state');
    
    // Mock 설정 - 인증 제공자 맵 비우기
    jest.spyOn(handler['providersMap'], 'get').mockReturnValue(undefined);
    
    // When & Then: 오류 발생 검증
    await expect(handler.execute(command)).rejects.toThrow('카카오 인증 제공자를 찾을 수 없습니다.');
  });
  
  /**
   * 카카오 액세스 토큰 요청 실패 테스트
   */
  it('카카오 액세스 토큰 요청 실패 시 오류가 발생해야 함', async () => {
    // Given: 테스트 데이터 준비
    const command = new SocialLoginCommand(AuthProvider.KAKAO, 'test-code', 'test-state');
    
    // Mock 설정 - 토큰 요청 실패
    mockKakaoAuthProvider.getAccessToken.mockRejectedValue(new Error('토큰 요청 실패'));
    
    // When & Then: 오류 발생 검증
    await expect(handler.execute(command)).rejects.toThrow('카카오 로그인 처리 중 오류가 발생했습니다: 토큰 요청 실패');
  });
});
