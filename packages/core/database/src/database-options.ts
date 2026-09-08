export interface DatabaseConfigReader {
  get<T>(key: string, fallback?: T): T;
}

export type DatabaseSslMode = 'disable' | 'require' | 'verify-full';

export interface DatabaseConnectionOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: false | { rejectUnauthorized: boolean };
}

export function readDatabaseBoolean(
  config: DatabaseConfigReader,
  key: string,
  fallback: boolean,
): boolean {
  const value = config.get<unknown>(key, fallback);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  throw new Error(`${key} must be true or false`);
}

export function resolveDatabaseSsl(mode: DatabaseSslMode | undefined) {
  switch (mode ?? 'disable') {
    case 'disable':
      return false;
    case 'require':
      return { rejectUnauthorized: false };
    case 'verify-full':
      return { rejectUnauthorized: true };
    default:
      throw new Error(
        'DATABASE_SSL_MODE must be one of disable, require, or verify-full',
      );
  }
}

export function readDatabaseConnectionOptions(
  config: DatabaseConfigReader,
): DatabaseConnectionOptions {
  return {
    host: config.get<string>('DATABASE_HOST'),
    port: Number(config.get<number>('DATABASE_PORT', 5432)),
    user: config.get<string>('DATABASE_USERNAME'),
    password: config.get<string>('DATABASE_PASSWORD'),
    database: config.get<string>('DATABASE_NAME'),
    ssl: resolveDatabaseSsl(
      config.get<DatabaseSslMode>('DATABASE_SSL_MODE', 'disable'),
    ),
  };
}
