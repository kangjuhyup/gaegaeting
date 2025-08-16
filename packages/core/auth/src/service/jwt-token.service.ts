import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

/**
 * JWT 토큰 관련 서비스
 * 토큰 생성 및 검증 기능 제공
 */
@Injectable()
export class JwtTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly secret: string,
    private readonly expiresIn: number,
    private readonly refreshExpiresIn: number
  ) {
    console.log("JwtTokenService secret : ", secret);
  }

  /**
   * 액세스 토큰 생성
   * @param payload 토큰에 포함될 데이터
   * @returns 생성된 액세스 토큰
   */
  async createAccessToken(payload: Record<string, any>): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.secret,
      expiresIn: this.expiresIn,
    });
  }

  /**
   * 리프레시 토큰 생성
   * @param payload 토큰에 포함될 데이터
   * @returns 생성된 리프레시 토큰
   */
  async createRefreshToken(payload: Record<string, any>): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.secret,
      expiresIn: this.refreshExpiresIn,
    });
  }

  /**
   * 토큰 검증
   * @param token 검증할 토큰
   * @returns 검증된 토큰의 페이로드
   * @throws UnauthorizedException 토큰이 유효하지 않은 경우
   */
  async verify<T extends Record<string, any>>(token: string): Promise<T> {
    try {
      return await this.jwtService.verifyAsync<T>(token, {
        secret: this.secret,
      });
    } catch (error) {
      console.log(error);
      throw new UnauthorizedException("유효하지 않은 토큰입니다.");
    }
  }

  get getExpriesIn() {
    return {
      acess: this.expiresIn,
      refresh: this.refreshExpiresIn,
    };
  }
}
