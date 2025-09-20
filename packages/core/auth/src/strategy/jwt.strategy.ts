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
    //TODO: 추후 payload 검증 추가로직 구현
    if (!payload) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
    
    return payload;
  }
}
