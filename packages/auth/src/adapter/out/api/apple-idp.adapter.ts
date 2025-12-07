import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppleClaims, AppleIdpPort } from '../../../application/port/api/apple-idp.port';
import { ENV_KEY } from '../../../common/config/env.config';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';

@Injectable()
export class AppleIdpAdapter extends AppleIdpPort {
  private readonly logger = new Logger(AppleIdpAdapter.name);
  private readonly jwksClient: jwksClient.JwksClient;
  private readonly clientId: string | null;

  constructor(private readonly configService: ConfigService) {
    super();
    
    // Apple JWKS 클라이언트 초기화
    this.jwksClient = new jwksClient.JwksClient({
      jwksUri: 'https://appleid.apple.com/auth/keys',
      cache: true,
      cacheMaxAge: 86400000, // 24 hours
    });

    this.clientId = this.configService.get<string>(ENV_KEY.APPLE_CLIENT_ID) || null;
  }

  async verifyIdToken(idToken: string): Promise<AppleClaims> {
    try {
      // JWT 헤더에서 kid 추출
      const decoded = jwt.decode(idToken, { complete: true });
      if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
        throw new UnauthorizedException('Invalid token format');
      }

      const kid = decoded.header.kid;

      // JWKS에서 공개키 가져오기
      const key = await this.getSigningKey(kid);
      
      // JWT 검증
      const verified = jwt.verify(idToken, key, {
        algorithms: ['RS256'],
        issuer: 'https://appleid.apple.com',
        audience: this.clientId || undefined, // clientId가 설정되어 있으면 검증
      }) as AppleClaims;

      // 필수 클레임 확인
      if (!verified.sub || !verified.iss) {
        throw new UnauthorizedException('Missing required claims');
      }

      // iss 검증
      if (verified.iss !== 'https://appleid.apple.com') {
        throw new UnauthorizedException('Invalid issuer');
      }

      return verified;
    } catch (error) {
      this.logger.error(`Apple ID token verification failed: ${error.message}`);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      // 개발 환경에서는 스텁 모드로 동작 (환경 변수가 없을 때)
      if (process.env.NODE_ENV === 'development' && !this.clientId) {
        this.logger.warn('Apple client ID not configured, using stub mode');
        const sub = idToken.startsWith('apple_') ? idToken.substring('apple_'.length) : idToken;
        return {
          iss: 'https://appleid.apple.com',
          sub,
          aud: 'stub',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          email: undefined,
        };
      }
      
      throw new UnauthorizedException('Invalid Apple ID token');
    }
  }

  private async getSigningKey(kid: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.jwksClient.getSigningKey(kid, (err, key) => {
        if (err) {
          reject(err);
          return;
        }
        const signingKey = key?.getPublicKey();
        if (!signingKey) {
          reject(new Error('Failed to get signing key'));
          return;
        }
        resolve(signingKey);
      });
    });
  }
}


