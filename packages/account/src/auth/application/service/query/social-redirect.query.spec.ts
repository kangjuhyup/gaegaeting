import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SocialRedirectHandler } from './social-redirect.query';
import { SocialRedirectQuery } from '@app/auth/application/port/in/query/social-redirect.port';
import { AuthProvider } from '@app/auth/domain/model/type/auth-provider.type';

/**
 * 소셜 리다이렉트 핸들러 테스트
 * 
 * 소셜 로그인 리다이렉트 URL 생성 전략 패턴 구현을 테스트합니다.
 */
describe('SocialRedirectHandler', () => {
  let handler: SocialRedirectHandler;
  let configService: ConfigService;
  
  // 테스트용 모의 객체 생성
  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'KAKAO_CLIENT_ID':
          return 'kakao-client-id';
        case 'NAVER_CLIENT_ID':
          return 'naver-client-id';
        case 'GOOGLE_CLIENT_ID':
          return 'google-client-id';
        default:
          return null;
      }
    }),
  };
  
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialRedirectHandler,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();
    
    handler = module.get<SocialRedirectHandler>(SocialRedirectHandler);
    configService = module.get<ConfigService>(ConfigService);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  /**
   * 카카오 로그인 리다이렉트 URL 생성 테스트
   */
  it('카카오 로그인 리다이렉트 URL을 올바르게 생성해야 함', async () => {
    // Given: 테스트 데이터 준비
    const redirectUrl = 'https://app.gaegaeting.com/auth/kakao/callback';
    const query = new SocialRedirectQuery(AuthProvider.KAKAO, redirectUrl);
    
    // When: 쿼리 실행
    const result = await handler.execute(query);
    
    // Then: 결과 검증
    expect(result).toBeDefined();
    expect(result).toContain('https://kauth.kakao.com/oauth/authorize');
    expect(result).toContain('client_id=kakao-client-id');
    expect(result).toContain(`redirect_uri=${encodeURIComponent(redirectUrl)}`);
    expect(result).toContain('response_type=code');
    
    // ConfigService 호출 검증
    expect(mockConfigService.get).toHaveBeenCalledWith('KAKAO_CLIENT_ID');
  });
  
  /**
   * 네이버 로그인 리다이렉트 URL 생성 테스트
   */
  it('네이버 로그인 리다이렉트 URL을 올바르게 생성해야 함', async () => {
    // Given: 테스트 데이터 준비
    const redirectUrl = 'https://app.gaegaeting.com/auth/naver/callback';
    const query = new SocialRedirectQuery(AuthProvider.NAVER, redirectUrl);
    
    // Math.random 모킹
    const originalRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0.123456789);
    
    try {
      // When: 쿼리 실행
      const result = await handler.execute(query);
      
      // Then: 결과 검증
      expect(result).toBeDefined();
      expect(result).toContain('https://nid.naver.com/oauth2.0/authorize');
      expect(result).toContain('client_id=naver-client-id');
      expect(result).toContain(`redirect_uri=${encodeURIComponent(redirectUrl)}`);
      expect(result).toContain('response_type=code');
      expect(result).toContain('state=');
      
      // ConfigService 호출 검증
      expect(mockConfigService.get).toHaveBeenCalledWith('NAVER_CLIENT_ID');
    } finally {
      // 원래 Math.random 복원
      Math.random = originalRandom;
    }
  });
  
  /**
   * 구글 로그인 리다이렉트 URL 생성 테스트
   */
  it('구글 로그인 리다이렉트 URL을 올바르게 생성해야 함', async () => {
    // Given: 테스트 데이터 준비
    const redirectUrl = 'https://app.gaegaeting.com/auth/google/callback';
    const query = new SocialRedirectQuery(AuthProvider.GOOGLE, redirectUrl);
    
    // When: 쿼리 실행
    const result = await handler.execute(query);
    
    // Then: 결과 검증
    expect(result).toBeDefined();
    expect(result).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(result).toContain('client_id=google-client-id');
    expect(result).toContain(`redirect_uri=${encodeURIComponent(redirectUrl)}`);
    expect(result).toContain('response_type=code');
    expect(result).toContain(`scope=${encodeURIComponent('email profile')}`);
    
    // ConfigService 호출 검증
    expect(mockConfigService.get).toHaveBeenCalledWith('GOOGLE_CLIENT_ID');
  });
  
  /**
   * 지원하지 않는 인증 제공자 오류 테스트
   */
  it('지원하지 않는 인증 제공자인 경우 오류가 발생해야 함', async () => {
    // Given: 테스트 데이터 준비 (지원하지 않는 제공자)
    const redirectUrl = 'https://app.gaegaeting.com/auth/unknown/callback';
    const query = new SocialRedirectQuery('UNKNOWN' as any, redirectUrl);
    
    // When & Then: 오류 발생 검증
    await expect(handler.execute(query)).rejects.toThrow('지원하지 않는 인증 제공자입니다');
  });
});
