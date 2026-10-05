export interface IdentityVerificationResult {
  providerTransactionId: string;
  ci: string;
  di: string;
  adult: boolean;
}

export interface IdentityVerificationRequest {
  name: string;
  birthDate: string;
  gender: "MALE" | "FEMALE";
  phone: string;
}

export interface SignupIdentityVerificationResult extends IdentityVerificationResult {
  provider: string;
  verifiedAt: Date;
  identity: IdentityVerificationRequest;
}

export abstract class IdentityVerificationPort {
  abstract request(
    input: IdentityVerificationRequest,
  ): Promise<SignupIdentityVerificationResult>;
  // Compatibility for the existing mock handoff flow.
  abstract verify(
    input: IdentityVerificationResult,
  ): Promise<IdentityVerificationResult>;
}
