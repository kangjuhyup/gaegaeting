export interface AppleClaims {
  iss: string;
  sub: string;
  email?: string;
  email_verified?: string | boolean;
  aud: string;
  exp: number;
  iat: number;
  [k: string]: any;
}

export abstract class AppleIdpPort {
  abstract verifyIdToken(idToken: string): Promise<AppleClaims>;
}


