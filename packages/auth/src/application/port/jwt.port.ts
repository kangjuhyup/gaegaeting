export interface JwtSignOptions {
  secret: string;
  expiresIn: number;
}

export interface JwtVerifyOptions {
  secret: string;
}

export interface JwtPayload {
  sub: string;
  tenantId: string;
  iat: number;
  exp?: number;
  type?: 'access' | 'refresh';
  phoneVerified?: boolean;
  emailVerified?: boolean;
  roles?: string[];
  permissions?: string[];
  [key: string]: any;
}

export abstract class JwtPort {
  abstract sign(payload: any, options: JwtSignOptions): Promise<string>;
  abstract verify(token: string, options: JwtVerifyOptions): Promise<JwtPayload>;
}

