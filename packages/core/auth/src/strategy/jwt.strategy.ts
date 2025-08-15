import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * JWT 인증 전략 구현
 * Passport를 사용하여 JWT 토큰 검증
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {

  constructor(
    private readonly secret : string
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * JWT 토큰 검증 후 호출되는 메서드
   * @param payload 검증된 JWT 토큰의 페이로드
   * @returns 인증된 사용자 정보
   */
  async validate(payload: any) {
    // 여기서 추가적인 사용자 검증 로직을 구현할 수 있습니다.
    // 예: 데이터베이스에서 사용자 조회, 권한 확인 등
    
    if (!payload) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
    
    return payload;
  }
}
