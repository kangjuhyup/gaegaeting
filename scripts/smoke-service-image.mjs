import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const [service, image] = process.argv.slice(2);
const services = new Set(['account', 'match', 'gateway', 'edge-authz', 'integration-ui']);
if (!services.has(service) || !image || image.startsWith('-')) throw new Error('Usage: node scripts/smoke-service-image.mjs <service> <image>');
const env = {
  NODE_ENV: 'test', ACCOUNT_SERVICE_API_PORT: '2800', MATCH_SERVICE_API_PORT: '2801',
  INTERNAL_AUTH_ASSERTION_SECRET: 'image-test-secret-at-least-32-characters',
  AUTH_BASE_URL: 'http://127.0.0.1:3010', AUTH_ISSUER: 'http://127.0.0.1:3010/t/gaegaeting/oidc',
  AUTH_TENANT_CODE: 'gaegaeting', AUTH_PROVISIONING_CLIENT_ID: 'image-test-client',
  AUTH_PROVISIONING_CLIENT_SECRET: 'image-test-secret-at-least-32-characters',
  DATABASE_HOST: '127.0.0.1', DATABASE_PORT: '5433', DATABASE_USERNAME: 'image_test',
  DATABASE_PASSWORD: 'image_test', DATABASE_NAME: 'image_test',
  PUBLIC_DATA_API_KEY: 'image_test', REDIS_HOST: '127.0.0.1', REDIS_PORT: '6379',
  STORAGE_HOST: '127.0.0.1', STORAGE_PET_BUCKET: 'image-test', STORAGE_USER_BUCKET: 'image-test',
  STORAGE_PROFILE_PREFIX: 'profiles', STORAGE_REGION: 'local', STORAGE_ACCESS_KEY_ID: 'image_test',
  STORAGE_SECRET_ACCESS_KEY: 'image_test', ACCOUNT_SERVICE_HOST: 'http://127.0.0.1:2800',
  KAFKA_BROKERS: '127.0.0.1:9092',
};
let code;
if (service === 'integration-ui') {
  code = `
    const { createUiServer, readPublicConfig } = await import('./server.mjs');
    const config = readPublicConfig({ UI_OIDC_ISSUER: 'https://auth.example.test/t/gaegaeting-dev/oidc',
      UI_API_AUDIENCE: 'https://api-dev.example.test', UI_ACCOUNT_GRAPHQL_URL: 'https://api-dev.example.test/account/graphql',
      UI_GATEWAY_GRAPHQL_URL: 'https://api-dev.example.test/gateway/graphql' });
    const server = createUiServer(config);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      for (const path of ['/health', '/login', '/interaction', '/config.js']) {
        const res = await fetch('http://127.0.0.1:' + server.address().port + path);
        if (res.status !== 200) throw new Error('UI route failed: ' + path);
      }
    } finally { await new Promise(resolve => server.close(resolve)); }
  `;
} else {
  const entry = service === 'edge-authz' ? './dist/src/edge-authz/main.js' : './dist/src/main.js';
  const exported = service === 'edge-authz' ? 'startEdgeAuthz' : 'bootstrap';
  code = `const entry = await import(${JSON.stringify(entry)}); if (typeof entry[${JSON.stringify(exported)}] !== 'function') throw new Error('Missing runtime entry');`;
  if (service === 'account' || service === 'match') {
    code += `const migration = await import('./dist/src/migrations/migrate.js'); if (typeof migration.${service === 'account' ? 'runAccountMigrations' : 'runMatchMigrations'} !== 'function') throw new Error('Missing migration entry');`;
  }
}
code = `if (process.getuid() === 0) throw new Error('Runtime must be nonroot');` + code;
const args = ['run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL'];
for (const [key, value] of Object.entries(env)) args.push('-e', `${key}=${value}`);
args.push('--entrypoint', 'node', image, '--input-type=module', '-e', code);
// UI smoke uses loopback only; disabling external networking preserves this check's boundary.
const dockerExecutable = existsSync('/usr/bin/docker') ? '/usr/bin/docker'
  : existsSync('/opt/homebrew/bin/docker') ? '/opt/homebrew/bin/docker' : '/usr/local/bin/docker';
const result = spawnSync(dockerExecutable, args, { stdio: 'inherit', timeout: 60_000 });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`${service}: production image runtime and packaged entries verified`);
