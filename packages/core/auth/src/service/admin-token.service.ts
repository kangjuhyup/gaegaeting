import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

/**
 * 어드민 JWT 페이로드 인터페이스
 */
export interface AdminJwtPayload {
  adminId: string;
  role: 'ADMIN';
  iat?: number;
  exp?: number;
}

/**
 * 어드민 토큰 서비스
 * 관리자 전용 JWT 토큰 생성 및 검증 기능 제공
 */
@Injectable()
export class AdminTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly secret: string,
    private readonly expiresIn: number,
    private readonly refreshExpiresIn: number
  ) {}

  /**
   * 어드민 액세스 토큰 생성
   * @param adminId 어드민 ID
   * @returns 생성된 액세스 토큰
   */
  async createAccessToken(adminId: string): Promise<string> {
    const payload: AdminJwtPayload = {
      adminId,
      role: 'ADMIN',
    };

    return this.jwtService.signAsync(payload, {
      secret: this.secret,
      expiresIn: this.expiresIn,
    });
  }

  /**
   * 어드민 리프레시 토큰 생성
   * @param adminId 어드민 ID
   * @returns 생성된 리프레시 토큰
   */
  async createRefreshToken(adminId: string): Promise<string> {
    const payload: AdminJwtPayload = {
      adminId,
      role: 'ADMIN',
    };

    return this.jwtService.signAsync(payload, {
      secret: this.secret,
      expiresIn: this.refreshExpiresIn,
    });
  }

  /**
   * 어드민 토큰 검증 및 role 체크
   * @param token 검증할 토큰
   * @returns 검증된 토큰의 페이로드
   * @throws UnauthorizedException 토큰이 유효하지 않거나 role이 ADMIN이 아닌 경우
   */
  async verify(token: string): Promise<AdminJwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<AdminJwtPayload>(token, {
        secret: this.secret,
      });

      // role 검증
      if (payload.role !== 'ADMIN') {
        throw new UnauthorizedException('어드민 권한이 필요합니다.');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('유효하지 않은 어드민 토큰입니다.');
    }
  }

  /**
   * 토큰 만료 시간 조회
   */
  get getExpiresIn() {
    return {
      access: this.expiresIn,
      refresh: this.refreshExpiresIn,
    };
  }
}
