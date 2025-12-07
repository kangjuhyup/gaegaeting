export interface IssueTokenCommand {
  tenantId: string;
  userId: string;
  phoneVerified?: boolean;
  emailVerified?: boolean;
}

export interface AuthPayloadDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenMetadata {
  userId: string;
  tenantId: string;
  iat: number;
  exp: number;
  type?: 'access' | 'refresh';
}

export abstract class TokenServicePort {
  abstract issueForUser(cmd: IssueTokenCommand): Promise<AuthPayloadDto>;
  abstract verifyToken(token: string): Promise<TokenMetadata | null>;
  abstract revokeToken(token: string): Promise<void>;
  abstract revokeUserTokens(userId: string, tenantId: string): Promise<void>;
}


