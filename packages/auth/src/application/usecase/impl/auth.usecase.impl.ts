import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthUsecase, SignoutCommand, RefreshTokenCommand } from '../auth.usecase';
import { TokenServicePort } from '../../port/token-service.port';
import { AuthPayload } from '../social-signin.usecase';

@Injectable()
export class AuthUsecaseImpl implements AuthUsecase {
  constructor(
    private readonly tokenService: TokenServicePort,
  ) {}

  async signout(cmd: SignoutCommand): Promise<void> {
    if (cmd.allDevices) {
      // 모든 디바이스의 토큰 폐기
      await this.tokenService.revokeUserTokens(cmd.userId, cmd.tenantId);
    } else {
      // 현재 토큰만 폐기
      if (cmd.token) {
        await this.tokenService.revokeToken(cmd.token);
      }
    }
  }

  async refreshToken(cmd: RefreshTokenCommand): Promise<AuthPayload> {
    // 리프레시 토큰 검증
    const metadata = await this.tokenService.verifyToken(cmd.refreshToken);
    
    if (!metadata) {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }

    // 리프레시 토큰 타입 확인
    if (metadata.type !== 'refresh') {
      throw new UnauthorizedException('리프레시 토큰이 아닙니다.');
    }

    // 테넌트 ID 검증
    if (metadata.tenantId !== cmd.tenantId) {
      throw new UnauthorizedException('테넌트가 일치하지 않습니다.');
    }

    // 기존 리프레시 토큰 폐기
    await this.tokenService.revokeToken(cmd.refreshToken);

    // 새로운 토큰 발급
    const newTokens = await this.tokenService.issueForUser({
      userId: metadata.userId,
      tenantId: metadata.tenantId,
    });

    return {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      expiresIn: newTokens.expiresIn,
    };
  }
}

