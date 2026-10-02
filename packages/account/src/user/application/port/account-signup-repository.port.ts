export type SignupIdentity = {
  name: string;
  birthDate: Date;
  gender: 'MALE' | 'FEMALE';
  phone: string;
};

export type AccountSignupReservation = {
  diDigest: string;
  username: string;
  issuer: string;
  termsVersion: string;
  identity?: SignupIdentity;
};

export type AccountSignupRecord = {
  userId: string;
  username: string;
  issuer: string;
  authSubject?: string;
};

export abstract class AccountSignupRepositoryPort {
  abstract reserve(input: AccountSignupReservation): Promise<AccountSignupRecord>;
  abstract complete(input: { diDigest: string; subject: string }): Promise<AccountSignupRecord>;
  abstract findIdentity(userId: string): Promise<SignupIdentity | null>;
}
