export type AccountSignupRecord = {
  userId: string;
  username: string;
  issuer: string;
  authSubject?: string;
};

export abstract class AccountSignupRepositoryPort {
  abstract reserve(input: { diDigest: string; username: string; issuer: string; termsVersion: string }): Promise<AccountSignupRecord>;
  abstract complete(input: { diDigest: string; subject: string }): Promise<AccountSignupRecord>;
}
