import { Injectable } from '@nestjs/common';
import { verifyInternalAuthAssertion } from '@core/auth-assertion';
import type { UserPrincipal } from '../type/index.js';

export interface InternalAuthOptions {
  secret: string;
  issuer: string;
  audience: string;
}

@Injectable()
export class InternalAuthService {
  constructor(private readonly options: InternalAuthOptions) {}

  verify(assertion: string): UserPrincipal {
    return verifyInternalAuthAssertion(assertion, this.options);
  }
}
