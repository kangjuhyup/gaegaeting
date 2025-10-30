import { Injectable } from '@nestjs/common';
import { FindOrProvisionByIdentityCommand, FindOrProvisionResult, UserDto, UserRepositoryPort } from '../../application/port/user-repository.port';
import { ulid } from 'ulid';

interface IdentityKey {
  tenantId: string;
  provider: string;
  providerSub: string;
}

function identityKey(k: IdentityKey): string {
  return `${k.tenantId}:${k.provider}:${k.providerSub}`;
}

//TODO: InMemory -> DB 로 변경
@Injectable()
export class InMemoryUserRepository extends UserRepositoryPort {
  private identities = new Map<string, string>(); // key -> userId
  private users = new Map<string, UserDto>(); // userId -> user

  async findOrProvisionByIdentity(cmd: FindOrProvisionByIdentityCommand): Promise<FindOrProvisionResult> {
    const key = identityKey({ tenantId: cmd.tenantId, provider: cmd.provider, providerSub: cmd.providerSub });
    const existingUserId = this.identities.get(key);
    if (existingUserId) {
      const user = this.users.get(existingUserId)!;
      return { user, isNew: false };
    }

    const userId = ulid();
    const user: UserDto = {
      id: userId,
      username: cmd.usernameFallback,
      email: cmd.email ?? null ?? undefined,
    };
    this.users.set(userId, user);
    this.identities.set(key, userId);
    return { user, isNew: true };
  }
}


