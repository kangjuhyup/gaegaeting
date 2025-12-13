export interface CreateUserIdentityCommand {
  tenantId: string;
  userId: string;
  provider: string;
  providerSub: string;
  email?: string;
  profileJson?: any;
}

export abstract class UserIdentityRepositoryPort {
  abstract create(cmd: CreateUserIdentityCommand): Promise<void>;
}

