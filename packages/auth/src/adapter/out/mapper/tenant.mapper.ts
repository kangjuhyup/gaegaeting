import { TenantOrmEntity } from '@core/database';
import { Tenant } from '../../../domain/model/tenant';

export class TenantMapper {
  static toDomain(orm: TenantOrmEntity): Tenant {
    const tenant = Tenant.create({
      id: orm.id,
      code: orm.code,
      name: orm.name,
    });
    return tenant.setPersistence(orm.id, orm.createdAt, orm.updatedAt);
  }

  static toOrm(domain: Tenant): Partial<TenantOrmEntity> {
    return {
      id: domain.id,
      code: domain.code,
      name: domain.name,
    };
  }
}

