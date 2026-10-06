export type SignupIdentity = {
  name: string;
  birthDate: Date;
  gender: "MALE" | "FEMALE";
  phone: string;
};

type SignupReservationDetails = {
  diDigest: string;
  issuer: string;
  termsVersion: string;
  identity?: SignupIdentity;
  verification: SignupVerification;
};

export type AccountSignupReservation = SignupReservationDetails &
  (
    | { method?: "PASSWORD"; username: string; externalIdentityDigest?: never }
    | { method: "SOCIAL"; username?: never; externalIdentityDigest: string }
  );

export type SignupVerification = {
  provider: string;
  providerTransactionId: string;
  verifiedAt: Date;
};

export type AccountSignupRecord = {
  userId: string;
  username?: string;
  issuer: string;
  authSubject?: string;
};

export abstract class AccountSignupRepositoryPort {
  abstract reserve(
    input: AccountSignupReservation,
  ): Promise<AccountSignupRecord>;
  abstract complete(input: {
    diDigest: string;
    subject: string;
  }): Promise<AccountSignupRecord>;
  abstract findIdentity(userId: string): Promise<SignupIdentity | null>;
}
