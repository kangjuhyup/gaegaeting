import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENV_KEY } from '#app/config/env.config';
import { IdentityVerificationPort, type IdentityVerificationResult } from '../../../../application/port/identity-verification.port.js';

@Injectable()
export class MockIdentityVerificationAdapter implements IdentityVerificationPort {
  constructor(private readonly config: ConfigService) {}

  async verify(input: IdentityVerificationResult): Promise<IdentityVerificationResult> {
    if (!this.config.get<boolean>(ENV_KEY.REGISTRATION_MOCK_ENABLED)) {
      throw new ForbiddenException('Mock identity verification is disabled');
    }
    if (!input.providerTransactionId?.trim() || !input.ci?.trim() || !input.di?.trim()) {
      throw new Error('Mock identity verification result is incomplete');
    }
    return { ...input };
  }
}
