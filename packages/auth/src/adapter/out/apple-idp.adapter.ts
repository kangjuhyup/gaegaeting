import { Injectable } from '@nestjs/common';
import { AppleClaims, AppleIdpPort } from '../../application/port/apple-idp.port';

@Injectable()
export class AppleIdpAdapter extends AppleIdpPort {
  async verifyIdToken(idToken: string): Promise<AppleClaims> {
    // In production, verify JWT signature against Apple's JWKS and validate claims
    // For now, return a minimal stub based on the incoming token string
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
}


