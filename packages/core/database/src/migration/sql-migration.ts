import type { ClientConfig, QueryResult } from 'pg';

export interface SqlStatement {
  readonly text: string;
  readonly values?: readonly unknown[];
}

export type SchemaManifest =
  | { readonly entries: readonly string[] }
  | { readonly sha256: string };

export interface SqlMigration {
  readonly timestamp: number;
  readonly name: string;
  readonly statements: readonly SqlStatement[];
  readonly expectedTables: readonly string[];
  readonly manifest?: SchemaManifest;
}

export interface MigrationClient {
  connect(): Promise<void>;
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<QueryResult<Row>>;
  end(): Promise<void>;
}

export interface SqlMigrationRunnerOptions {
  readonly connection: ClientConfig;
  readonly historyTable: string;
  readonly lockKey: string;
  readonly migrations: readonly SqlMigration[];
  readonly createClient?: (connection: ClientConfig) => MigrationClient;
}
