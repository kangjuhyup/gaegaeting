export type RegistrationEligibilityStatus = 'ISSUED' | 'CLAIMED' | 'USED';

export interface IssuedRegistrationEligibility {
  id: string;
  userId: string;
  provider: string;
  providerTransactionId: string;
  diDigest: string;
  diKeyVersion: number;
  adult: boolean;
  tenantId: string;
  clientId: string;
  termsVersion: string;
  termsAgreedAt: Date;
  handoffDigest: string;
  status: RegistrationEligibilityStatus;
  expiresAt: Date;
}

export interface ClaimRegistrationEligibility {
  handoffDigest: string;
  tenantId: string;
  clientId: string;
  attemptId: string;
  now: Date;
  claimedUntil: Date;
}

export interface ClaimedRegistrationEligibility {
  registrationId: string;
  attemptId: string;
  claimedUntil: Date;
}

export interface CompleteRegistrationEligibility {
  registrationId: string;
  attemptId: string;
  issuer: string;
  subject: string;
  now: Date;
}

export abstract class RegistrationEligibilityRepositoryPort {
  abstract issue(record: IssuedRegistrationEligibility): Promise<IssuedRegistrationEligibility>;
  abstract claim(input: ClaimRegistrationEligibility): Promise<ClaimedRegistrationEligibility>;
  abstract complete(input: CompleteRegistrationEligibility): Promise<{ registrationId: string; status: 'USED' }>;
}
