export interface FindOrProvisionByIdentityCommand {
  tenantId: string;
  provider: 'kakao' | 'apple';
  providerSub: string;
  email?: string;
  usernameFallback: string;
  profileJson?: any;
}

export interface UserDto {
  id: string;
  username: string;
  email?: string | null;
}

export interface FindOrProvisionResult {
  user: UserDto;
  isNew: boolean;
}

export abstract class UserRepositoryPort {
  abstract findOrProvisionByIdentity(cmd: FindOrProvisionByIdentityCommand): Promise<FindOrProvisionResult>;
}


