import { UserOrmEntity, UserIdentityOrmEntity, TenantOrmEntity } from '@core/database';
import { User, UserIdentity } from '../../../domain/model/user';
import { Tenant } from '../../../domain/model/tenant';

export class UserMapper {
  static toDomain(orm: UserOrmEntity, identities?: UserIdentityOrmEntity[]): User {
    const domainIdentities: UserIdentity[] = (identities || orm.identities || []).map((i) => ({
      provider: i.provider as any,
      providerSub: i.providerSub,
      email: i.email ?? undefined,
      linkedAt: i.linkedAt,
    }));

    const user = User.of(
      {
        tenantId: typeof orm.tenant === 'object' ? orm.tenant.id : (orm.tenant as any),
        username: orm.username,
        email: orm.email ?? null,
        emailVerified: orm.emailVerified,
        phone: orm.phone ?? null,
        phoneVerified: orm.phoneVerified,
        passwordHash: orm.passwordHash ?? null,
        status: orm.status,
        identities: domainIdentities,
      },
      orm.id,
    );

    return user.setPersistence(orm.id, orm.createdAt, orm.updatedAt);
  }

  static toOrm(domain: User, tenant: Tenant): Partial<UserOrmEntity> {
    return {
      id: domain.id,
      tenant: { id: tenant.id } as TenantOrmEntity,
      username: domain.username,
      email: domain.email ?? undefined,
      emailVerified: domain.emailVerified,
      phone: domain.phone ?? undefined,
      phoneVerified: domain.phoneVerified,
      passwordHash: domain.passwordHash ?? undefined,
      status: domain.status,
    };
  }
}

