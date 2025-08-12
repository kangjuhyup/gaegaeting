import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FetchHttpClient } from '@core/http';
import { KakaoAuthAdapter } from './kakao-auth.adapter';
import { AuthProvider } from '@app/auth/domain/model/type/auth-provider.type';
import { AuthToken } from '@app/auth/domain/model/auth-token';

/**
 * 카카오 인증 어댑터 테스트
 * 
 * 카카오 로그인 API와 통신하는 어댑터를 테스트합니다.
 */
describe('KakaoAuthAdapter', () => {
  let adapter: KakaoAuthAdapter;
  let mockHttpClient: jest.Mocked<FetchHttpClient>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    // 모의 객체 생성
    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
    } as unknown as jest.Mocked<FetchHttpClient>;

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'KAKAO_CLIENT_ID') return 'test_client_id';
        if (key === 'KAKAO_CLIENT_SECRET') return 'test_client_secret';
        return defaultValue;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    // 테스트 모듈 생성
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KakaoAuthAdapter,
        {
          provide: FetchHttpClient,
          useValue: mockHttpClient,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    adapter = module.get<KakaoAuthAdapter>(KakaoAuthAdapter);
  });

  /**
   * 인증 URL 생성 테스트
   * 
   * 카카오 로그인 URL을 정상적으로 생성하는지 테스트합니다.
   */
  describe('getAuthorizationUrl', () => {
    it('카카오 로그인 URL을 정상적으로 생성해야 합니다', () => {
      // Given
      const redirectUrl = 'http://localhost:3000/auth/kakao/callback';

      // When
      const result = adapter.getAuthorizationUrl(redirectUrl);

      // Then
      expect(result).toContain('https://kauth.kakao.com/oauth/authorize');
      expect(result).toContain('client_id=test_client_id');
      expect(result).toContain(`redirect_uri=${encodeURIComponent(redirectUrl)}`);
      expect(result).toContain('response_type=code');
    });
  });

  /**
   * 액세스 토큰 요청 테스트
   * 
   * 인증 코드로 액세스 토큰을 정상적으로 요청하는지 테스트합니다.
   */
  describe('getAccessToken', () => {
    it('인증 코드로 액세스 토큰을 정상적으로 요청해야 합니다', async () => {
      // Given
      const code = 'test_auth_code';
      const redirectUrl = 'http://localhost:3000/auth/kakao/callback';
      
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          access_token: 'test_access_token',
          refresh_token: 'test_refresh_token',
          expires_in: 3600,
          token_type: 'bearer',
        }),
      };
      
      mockHttpClient.post.mockResolvedValue(mockResponse as any);

      // When
      const result = await adapter.getAccessToken(code, redirectUrl);

      // Then
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://kauth.kakao.com/oauth/token',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
          }),
          body: expect.stringContaining('grant_type=authorization_code'),
        })
      );
      
      expect(result).toBeInstanceOf(AuthToken);
      expect(result.getAccessToken()).toBe('test_access_token');
      expect(result.getRefreshToken()).toBe('test_refresh_token');
      expect(result.getExpiresIn()).toBe(3600);
    });
  });

  /**
   * 사용자 프로필 요청 테스트
   * 
   * 액세스 토큰으로 사용자 프로필을 정상적으로 요청하는지 테스트합니다.
   */
  describe('getUserProfile', () => {
    it('액세스 토큰으로 사용자 프로필을 정상적으로 요청해야 합니다', async () => {
      // Given
      const accessToken = 'test_access_token';
      
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          id: 12345678,
          properties: {
            nickname: '테스트 사용자',
            profile_image: 'http://example.com/profile.jpg',
          },
          kakao_account: {
            email: 'test@example.com',
            profile: {
              nickname: '테스트 사용자',
              profile_image_url: 'http://example.com/profile.jpg',
            },
          },
        }),
      };
      
      mockHttpClient.get.mockResolvedValue(mockResponse as any);

      // When
      const result = await adapter.getUserProfile(accessToken);

      // Then
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://kapi.kakao.com/v2/user/me',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${accessToken}`,
          }),
        })
      );
      
      expect(result.getProvider()).toBe(AuthProvider.KAKAO);
      expect(result.getProviderId()).toBe('12345678');
      expect(result.getEmail()).toBe('test@example.com');
      expect(result.getName()).toBe('테스트 사용자');
      expect(result.getProfileImage()).toBe('http://example.com/profile.jpg');
    });
  });

  /**
   * 지원하는 인증 제공자 테스트
   * 
   * 지원하는 인증 제공자를 정상적으로 반환하는지 테스트합니다.
   */
  describe('getSupportedProvider', () => {
    it('카카오 인증 제공자를 반환해야 합니다', () => {
      // When
      const result = adapter.getSupportedProvider();

      // Then
      expect(result).toBe(AuthProvider.KAKAO);
    });
  });
});
