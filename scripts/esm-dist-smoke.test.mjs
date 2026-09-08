import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const libraryEntries = [
  'packages/core/auth-assertion/dist/src/index.js',
  'packages/core/auth/dist/src/index.js',
  'packages/core/database/dist/src/index.js',
  'packages/core/http/dist/src/index.js',
  'packages/core/kafka/dist/src/index.js',
  'packages/core/logger/dist/src/index.js',
  'packages/core/model/dist/src/index.js',
  'packages/core/redis/dist/src/index.js',
  'packages/core/slack/dist/index.js',
  'packages/core/storage/dist/src/index.js',
  'packages/core/util/dist/src/index.js',
];
const serviceEntries = [
  'packages/gateway/dist/src/main.js',
  'packages/account/dist/src/main.js',
  'packages/match/dist/src/main.js',
];
const migrationEntries = [
  {
    entry: 'packages/account/dist/src/migrations/migrate.js',
    exportName: 'runAccountMigrations',
  },
  {
    entry: 'packages/match/dist/src/migrations/migrate.js',
    exportName: 'runMatchMigrations',
  },
  {
    entry: 'packages/core/database/dist/src/migration/migrate-baseline.js',
    exportName: 'runCoreBaselineMigration',
  },
];

Object.assign(process.env, {
  NODE_ENV: 'test',
  ACCOUNT_SERVICE_API_PORT: '0',
  AUTH_SERVICE_API_PORT: '0',
  MATCH_SERVICE_API_PORT: '0',
  INTERNAL_AUTH_ASSERTION_SECRET: 'esm-smoke-secret-at-least-32-characters',
  DATABASE_HOST: '127.0.0.1',
  DATABASE_PORT: '5433',
  DATABASE_USERNAME: 'esm_smoke',
  DATABASE_PASSWORD: 'esm_smoke',
  DATABASE_NAME: 'esm_smoke',
  AUTH_DATABASE_NAME: 'esm_smoke',
  PUBLIC_DATA_API_KEY: 'esm_smoke',
  REDIS_HOST: '127.0.0.1',
  REDIS_PORT: '6379',
  STORAGE_HOST: '127.0.0.1',
  STORAGE_PET_BUCKET: 'esm-smoke-pet',
  STORAGE_USER_BUCKET: 'esm-smoke-user',
  STORAGE_PROFILE_PREFIX: 'profiles',
  STORAGE_REGION: 'local',
  STORAGE_ACCESS_KEY_ID: 'esm_smoke',
  STORAGE_SECRET_ACCESS_KEY: 'esm_smoke',
  ACCOUNT_SERVICE_HOST: 'http://127.0.0.1:3000',
  KAFKA_BROKERS: '127.0.0.1:9092',
  NAVER_CLOUD_ACCESS_KEY: 'esm_smoke',
  NAVER_CLOUD_SECRET_KEY: 'esm_smoke',
  NAVER_CLOUD_SMS_SERVICE_ID: 'esm_smoke',
  NAVER_CLOUD_SMS_SENDER: '01000000000',
  SOLAPI_KEY: 'esm_smoke',
  SOLAPI_SECRET: 'esm_smoke',
  SOLAPI_SMS_SENDER: '01000000000',
  AUTH_ROOT_ID: 'esm_smoke',
  AUTH_ROOT_PASSWORD: 'esm_smoke',
});

test('compiled library entry points load as native ESM', async () => {
  for (const entry of libraryEntries) {
    const url = new URL(entry, root);
    await access(url);
    await import(url.href);
  }
  assert.ok(true);
});

test('compiled service entry points load without starting external services', async () => {
  for (const entry of serviceEntries) {
    const url = new URL(entry, root);
    await access(url);
    const service = await import(url.href);
    assert.equal(typeof service.bootstrap, 'function', entry);
  }
});

test('compiled migration entry points load without running migrations', async () => {
  for (const { entry, exportName } of migrationEntries) {
    const url = new URL(entry, root);
    await access(url);
    const migration = await import(url.href);
    assert.equal(typeof migration[exportName], 'function', entry);
  }
});
