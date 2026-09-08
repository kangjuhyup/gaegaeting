import { ReflectMetadataProvider } from '@mikro-orm/decorators/legacy';
import type { MikroOrmModuleOptions } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import {
  readDatabaseBoolean,
  readDatabaseConnectionOptions,
  type DatabaseConfigReader,
} from '../database-options.js';

type MikroPostgresOptions = MikroOrmModuleOptions<PostgreSqlDriver> & {
  driver: typeof PostgreSqlDriver;
  entities: NonNullable<MikroOrmModuleOptions<PostgreSqlDriver>['entities']>;
  schemaGenerator: NonNullable<MikroOrmModuleOptions<PostgreSqlDriver>['schemaGenerator']> & {
    dropTables: false;
  };
};

export function buildMikroPostgresOptions(
  config: DatabaseConfigReader,
  entities: NonNullable<MikroOrmModuleOptions<PostgreSqlDriver>['entities']>,
): MikroPostgresOptions {
  const mutationRequested = [
    'DATABASE_SYNCHRONIZE',
    'MIKRO_ORM_SCHEMA_UPDATE',
    'MIKRO_ORM_SCHEMA_DROP',
    'MIKRO_ORM_SCHEMA_REFRESH',
  ].some(key => readDatabaseBoolean(config, key, false));

  if (mutationRequested) {
    throw new Error(
      'Automatic schema mutation is disabled',
    );
  }

  const connection = readDatabaseConnectionOptions(config);

  return {
    driver: PostgreSqlDriver,
    host: connection.host,
    port: connection.port,
    user: connection.user,
    password: connection.password,
    dbName: connection.database,
    entities,
    debug: readDatabaseBoolean(config, 'DATABASE_LOG', true),
    allowGlobalContext: false,
    metadataProvider: ReflectMetadataProvider,
    driverOptions: {
      ssl: connection.ssl,
    },
    schemaGenerator: {
      dropTables: false,
    },
  };
}
