export type ExternalSignupAttempt = {
  ticket: string;
  attemptId: string;
  clientId: string;
};

export type VerifiedExternalSignup = {
  ticketId: string;
  provider: string;
  providerSub: string;
  clientId: string;
  issuer: string;
  expiresAt: Date;
};

export abstract class AuthExternalSignupPort {
  abstract claim(input: ExternalSignupAttempt): Promise<VerifiedExternalSignup>;
  abstract complete(
    input: ExternalSignupAttempt & { idempotencyKey: string },
  ): Promise<{
    issuer: string;
    authSubject: string;
  }>;
}
export const SOCIAL_SIGNUP_CLIENT_IDS = ['gaegaeting-web', 'gaegaeting-mobile'] as const;
