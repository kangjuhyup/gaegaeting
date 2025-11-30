import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthPayloadDto, IssueTokenCommand, TokenServicePort } from '../../application/port/token-service.port';
import { ENV_KEY } from '@app/common/config/env.config';

@Injectable()
export class SimpleTokenService extends TokenServicePort {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async issueForUser(cmd: IssueTokenCommand): Promise<AuthPayloadDto> {
    const secret = this.configService.get<string>(ENV_KEY.JWT_SECRET);
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const accessExpiration = this.configService.get<string>(ENV_KEY.JWT_ACCESS_EXPIRATION) || '1h';
    const refreshExpiration = this.configService.get<string>(ENV_KEY.JWT_REFRESH_EXPIRATION) || '30d';

    // JWT 페이로드 생성
    const payload = {
      sub: cmd.userId,
      tenantId: cmd.tenantId,
      iat: Math.floor(Date.now() / 1000),
    };

    // expiresIn을 초 단위로 변환
    const expiresInSeconds = this.parseExpirationToSeconds(accessExpiration);
    const refreshTokenExpiresInSeconds = this.parseExpirationToSeconds(refreshExpiration);

    // Access Token 발급
    const accessToken = await this.jwtService.signAsync(payload, {
      secret,
      expiresIn: expiresInSeconds,
    });

    // Refresh Token 발급
    const refreshToken = await this.jwtService.signAsync(
      { ...payload, type: 'refresh' },
      {
        secret,
        expiresIn: refreshTokenExpiresInSeconds,
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * 만료 시간 문자열을 초 단위로 변환
   * 예: '1h' -> 3600, '30d' -> 2592000, '15m' -> 900
   */
  private parseExpirationToSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      // 기본값: 1시간
      return 3600;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 3600;
    }
  }
}


