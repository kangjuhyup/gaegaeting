import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * 소셜 로그인 콜백 DTO
 * 
 * 소셜 로그인 콜백 처리를 위한 DTO 클래스입니다.
 */
export class SocialCallbackDto {
  /**
   * 인증 코드
   * 
   * 소셜 로그인 제공자로부터 받은 인증 코드
   */
  @IsNotEmpty({ message: '인증 코드는 필수입니다.' })
  @IsString({ message: '인증 코드는 문자열이어야 합니다.' })
  code: string;

  /**
   * 상태 값
   * 
   * CSRF 방지를 위한 상태 값 (선택 사항)
   */
  @IsOptional()
  @IsString({ message: '상태 값은 문자열이어야 합니다.' })
  state?: string;
}
