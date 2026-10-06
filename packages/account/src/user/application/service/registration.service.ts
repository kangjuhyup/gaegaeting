import { ConflictException, Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { ulid } from 'ulid';
import { IdentityVerificationPort, type IdentityVerificationResult } from '../port/identity-verification.port.js';
import { RegistrationEligibilityRepositoryPort } from '../port/registration-eligibility-repository.port.js';

export const REGISTRATION_OPTIONS = Symbol('REGISTRATION_OPTIONS');

export interface RegistrationOptions {
  authIssuer?: string;
  signupClientId?: string;
  signupClientIds?: readonly string[];
  diHmacSecret: string;
  diHmacKeyVersion: number;
  handoffTtlMs: number;
  claimTtlMs: number;
  now?: () => Date;
  randomHandoffId?: () => string;
  randomId?: () => string;
  randomUserId?: () => string;
}

export interface CompleteMockVerificationInput extends IdentityVerificationResult {
  tenantId: string;
  clientId: string;
  termsVersion: string;
  termsAgreed: boolean;
}

@Injectable()
export class RegistrationService {
  constructor(
    private readonly repository: RegistrationEligibilityRepositoryPort,
    private readonly verifier: IdentityVerificationPort,
    @Inject(REGISTRATION_OPTIONS) private readonly options: RegistrationOptions,
  ) {}

  async completeMockVerification(input: CompleteMockVerificationInput): Promise<{ handoffId: string; expiresAt: Date }> {
    const verified = await this.verifier.verify(input);
    if (!verified.adult) throw new UnprocessableEntityException('Adult verification is required');
    if (!input.termsAgreed || !input.termsVersion.trim()) {
      throw new UnprocessableEntityException('Terms agreement is required');
    }
    const now = this.now();
    const handoffId = this.options.randomHandoffId?.() ?? randomBytes(32).toString('base64url');
    try {
      await this.repository.issue({
        id: this.options.randomId?.() ?? ulid(),
        userId: this.options.randomUserId?.() ?? ulid(),
        provider: 'mock',
        providerTransactionId: verified.providerTransactionId,
        diDigest: createHmac('sha256', this.options.diHmacSecret).update(verified.di).digest('hex'),
        diKeyVersion: this.options.diHmacKeyVersion,
        adult: true,
        tenantId: input.tenantId,
        clientId: input.clientId,
        termsVersion: input.termsVersion,
        termsAgreedAt: now,
        handoffDigest: this.digest(handoffId),
        status: 'ISSUED',
        expiresAt: new Date(now.getTime() + this.options.handoffTtlMs),
      });
    } catch (error) {
      if (['23505', 'ER_DUP_ENTRY'].includes((error as { code?: string })?.code ?? '')) {
        throw new ConflictException('Identity is already registered or verification was already used');
      }
      throw error;
    }
    return { handoffId, expiresAt: new Date(now.getTime() + this.options.handoffTtlMs) };
  }

  claim(input: { handoffId: string; tenantId: string; clientId: string; attemptId: string }) {
    const now = this.now();
    return this.repository.claim({
      handoffDigest: this.digest(input.handoffId), tenantId: input.tenantId, clientId: input.clientId,
      attemptId: input.attemptId, now,
      claimedUntil: new Date(now.getTime() + this.options.claimTtlMs),
    });
  }

  complete(input: { registrationId: string; attemptId: string; issuer: string; subject: string }) {
    return this.repository.complete({ ...input, now: this.now() });
  }

  private now(): Date { return this.options.now?.() ?? new Date(); }
  private digest(value: string): string { return createHash('sha256').update(value).digest('hex'); }
}
