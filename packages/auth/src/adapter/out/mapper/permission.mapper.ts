import { Permission } from '@app/domain/model/permission';
import { PermissionOrmEntity } from '@core/database';

export class PermissionMapper {
  static toDomain(orm: PermissionOrmEntity): Permission {
    const permission = Permission.of(
      {
        tenantId: String(orm.tenant.id),
        code: orm.code,
        resource: orm.resource ?? null,
        action: orm.action ?? null,
        description: orm.description ?? null,
      },
      String(orm.id),
    );
    return permission.setPersistence(String(orm.id), orm.createdAt, orm.updatedAt);
  }

  static toOrm(domain: Permission): Partial<PermissionOrmEntity> {
    return {
      id: domain.id,
      code: domain.code,
      resource: domain.resource,
      action: domain.action,
      description: domain.description,
      updatedAt: domain.updatedAt,
    };
  }
}

