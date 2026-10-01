export interface IdentityVerificationResult {
  providerTransactionId: string;
  ci: string;
  di: string;
  adult: boolean;
}

export abstract class IdentityVerificationPort {
  abstract verify(input: IdentityVerificationResult): Promise<IdentityVerificationResult>;
}
