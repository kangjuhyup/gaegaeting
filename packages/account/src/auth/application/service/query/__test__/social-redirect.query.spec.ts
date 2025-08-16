import { ConfigService } from '@nestjs/config';
import { SocialRedirectHandler } from '../social-redirect.query';
import { SocialRedirectQuery } from '@app/auth/application/port/in/query/social-redirect.port';
import { KakaoRedirectStrategy, NaverRedirectStrategy, GoogleRedirectStrategy } from '../../redirect-strategy';
import { AuthProvider } from '@core/auth/src/type/enum/auth-provider.enum';

// ConfigService 모킹
jest.mock('@nestjs/config');
jest.mock('../../redirect-strategy', () => {
  return {
    KakaoRedirectStrategy: jest.fn().mockImplementation(() => ({
      generateAuthUrl: jest.fn().mockReturnValue('https://kauth.kakao.com/oauth/authorize?mock=true')
    })),
    NaverRedirectStrategy: jest.fn().mockImplementation(() => ({
      generateAuthUrl: jest.fn().mockReturnValue('https://nid.naver.com/oauth2.0/authorize?mock=true')
    })),
    GoogleRedirectStrategy: jest.fn().mockImplementation(() => ({
      generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth?mock=true')
    }))
  };
});




describe('SocialRedirectHandler 단위 테스트', () => {
  let configService: jest.Mocked<ConfigService>;
  let socialRedirectHandler: SocialRedirectHandler;
  
  const mockRedirectUrl = 'http://localhost:3000/callback';

  beforeEach(() => {
    jest.clearAllMocks();
    configService = new ConfigService() as jest.Mocked<ConfigService>;
    socialRedirectHandler = new SocialRedirectHandler(configService);
  });

  it('카카오 인증 URL을 생성해야 함', async () => {
    // Given
    const query = new SocialRedirectQuery(AuthProvider.KAKAO.value, mockRedirectUrl);
    
    // When
    const result = await socialRedirectHandler.execute(query);
    
    // Then
    expect(KakaoRedirectStrategy).toHaveBeenCalledWith(configService);
    expect(result).toBe('https://kauth.kakao.com/oauth/authorize?mock=true');
  });

  it('네이버 인증 URL을 생성해야 함', async () => {
    // Given
    const query = new SocialRedirectQuery(AuthProvider.NAVER.value, mockRedirectUrl);
    
    // When
    const result = await socialRedirectHandler.execute(query);
    
    // Then
    expect(NaverRedirectStrategy).toHaveBeenCalledWith(configService);
    expect(result).toBe('https://nid.naver.com/oauth2.0/authorize?mock=true');
  });

  it('구글 인증 URL을 생성해야 함', async () => {
    // Given
    const query = new SocialRedirectQuery(AuthProvider.GOOGLE.value, mockRedirectUrl);
    
    // When
    const result = await socialRedirectHandler.execute(query);
    
    // Then
    expect(GoogleRedirectStrategy).toHaveBeenCalledWith(configService);
    expect(result).toBe('https://accounts.google.com/o/oauth2/auth?mock=true');
  });

  it('지원하지 않는 인증 제공자일 경우 에러를 발생시켜야 함', async () => {
    // Given
    const invalidProvider = 999; // 유효하지 않은 provider 값
    const query = new SocialRedirectQuery(invalidProvider, mockRedirectUrl);
    
    // When & Then
    await expect(socialRedirectHandler.execute(query)).rejects.toThrow('지원하지 않는 인증 제공자입니다');
  });
});
