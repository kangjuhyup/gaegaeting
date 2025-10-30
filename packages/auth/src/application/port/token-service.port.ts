export interface IssueTokenCommand {
  tenantId: string;
  userId: string;
}

export interface AuthPayloadDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export abstract class TokenServicePort {
  abstract issueForUser(cmd: IssueTokenCommand): Promise<AuthPayloadDto>;
}


