import { Role } from '@app/domain/model/role';
import { RoleOrmEntity, TenantOrmEntity } from '@core/database';
import { Tenant } from '@app/domain/model/tenant';

export class RoleMapper {
  static toDomain(orm: RoleOrmEntity): Role {
    const role = Role.of(
      {
        tenantId: String(orm.tenant.id),
        code: orm.code,
        name: orm.name,
        description: orm.description ?? null,
      },
      String(orm.id),
    );
    return role.setPersistence(String(orm.id), orm.createdAt, orm.updatedAt);
  }

  static toOrm(domain: Role, tenant: Tenant): Partial<RoleOrmEntity> {
    return {
      id: domain.id,
      tenant: { id: tenant.id } as TenantOrmEntity,
      code: domain.code,
      name: domain.name,
      description: domain.description,
    };
  }
}

