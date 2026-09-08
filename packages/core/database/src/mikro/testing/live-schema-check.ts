import { ReflectMetadataProvider } from '@mikro-orm/decorators/legacy';
import { MikroORM, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Client } from 'pg';
import { DatabaseSchema } from '../../database-schema.js';
import type { DatabaseConfigReader } from '../../database-options.js';
import { getMikroEntitiesBySchema } from '../datasource/database-schema.js';
import { UserProfileOrmEntity } from '../entity/account/user-profile.js';
import { buildMikroPostgresOptions } from '../mikro-database-options.js';

const schema = process.argv[2] as DatabaseSchema | undefined;
const validSchemas = Object.values(DatabaseSchema);
const runId = process.env.MIKROORM_PARITY_RUN_ID;
const databaseName = process.env.DATABASE_NAME;

if (process.env.MIKROORM_PARITY_DISPOSABLE !== '1') {
  throw new Error('Live schema check only accepts a disposable database');
}
if (!schema || !validSchemas.includes(schema)) {
  throw new Error(`Expected one schema argument: ${validSchemas.join(', ')}`);
}
if (!['127.0.0.1', 'localhost'].includes(process.env.DATABASE_HOST ?? '')) {
  throw new Error('Live schema check only accepts a loopback database host');
}
if (!runId || !/^[a-f0-9]{16}$/.test(runId)) {
  throw new Error('Live schema check requires a randomized run identifier');
}
if (databaseName !== `mikro_parity_${runId}_${schema.toLowerCase()}`) {
  throw new Error('Live schema check database identity does not match this run');
}
if (Number(process.env.DATABASE_PORT) === 5432) {
  throw new Error('Live schema check refuses the default PostgreSQL port');
}

const environment: DatabaseConfigReader = {
  get<T>(key: string, fallback?: T): T {
    const value = process.env[key];
    return (value === undefined ? fallback : value) as T;
  },
};

const safetyProbe = new Client({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  database: databaseName,
  user: 'postgres',
  password: process.env.MIKROORM_PARITY_ADMIN_PASSWORD,
});
let mikro: MikroORM | undefined;
let safetyEnded = false;

try {
  await safetyProbe.connect();
  const result = await safetyProbe.query<{ marker?: string }>(
    `select shobj_description(oid, 'pg_database') as marker
       from pg_database
      where datname = current_database()`,
  );
  if (result.rows[0]?.marker !== `mikroorm-parity:${runId}`) {
    throw new Error('Disposable PostgreSQL marker is missing or invalid');
  }
  await safetyProbe.end();
  safetyEnded = true;

  mikro = await MikroORM.init({
    ...buildMikroPostgresOptions(environment, getMikroEntitiesBySchema([schema])),
    metadataProvider: ReflectMetadataProvider,
    driver: PostgreSqlDriver,
  });
  const sql = await mikro.schema.getUpdateSchemaSQL({ wrap: false, dropTables: false });
  if (sql.trim()) {
    throw new Error(`MikroORM schema drift for ${schema}:\n${sql}`);
  }

  if (schema === DatabaseSchema.USER) {
    const entityManager = mikro.em.fork();
    const user = entityManager.create(UserProfileOrmEntity, {
      name: 'schema-check-user',
      nickname: 'before-update',
      gender: 0,
      birthDate: new Date('2020-01-01T00:00:00.000Z'),
      region: 0,
    });
    entityManager.persist(user);
    await entityManager.flush();
    const initialUpdatedAt = user.updatedAt.getTime();
    await entityManager.getConnection().execute('select pg_sleep(0.01)');
    user.nickname = 'after-update';
    await entityManager.flush();
    await entityManager.refresh(user);
    if (user.updatedAt.getTime() <= initialUpdatedAt) {
      throw new Error('Database-generated update timestamp did not advance');
    }
  }
  process.stdout.write(`MikroORM ${schema} schema check passed\n`);
} finally {
  await mikro?.close(true);
  if (!safetyEnded) await safetyProbe.end();
}
