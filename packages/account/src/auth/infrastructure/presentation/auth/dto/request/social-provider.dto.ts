import { AuthProvider } from '@core/auth';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty } from 'class-validator';

/**
 * 소셜 로그인 제공자 DTO
 * 
 * 소셜 로그인 제공자 파라미터를 위한 DTO 클래스입니다.
 */
export class SocialProviderDto {
  /**
   * 소셜 로그인 제공자
   * 
   * 지원되는 소셜 로그인 제공자: kakao, naver, google
   */
  @IsNotEmpty({ message: '소셜 로그인 제공자는 필수입니다.' })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    
    const lowerValue = value.toLowerCase();
    switch (lowerValue) {
      case 'kakao':
        return AuthProvider.KAKAO;
      case 'naver':
        return AuthProvider.NAVER;
      case 'google':
        return AuthProvider.GOOGLE;
      default:
        return value; // 유효성 검사에서 처리
    }
  })
  @IsEnum(AuthProvider, { message: '지원하지 않는 소셜 로그인 제공자입니다. (kakao, naver, google만 지원)' })
  provider: AuthProvider;
}
