import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { realpathSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { serviceEnvironment } from './dev.mjs';

test('injected connection and auth settings are preserved', () => {
  const config = {
    DATABASE_HOST: 'external-db.example.test', DATABASE_PORT: '15432',
    DATABASE_NAME: 'account_local', OIDC_ISSUER: 'https://auth.example.test',
    OIDC_ALLOW_INSECURE_HTTP: 'false', NODE_ENV: 'test',
  };
  for (const service of ['account', 'match', 'gateway']) {
    const environment = serviceEnvironment(service, config);
    for (const [key, value] of Object.entries(config)) assert.equal(environment[key], value);
  }
});

test('unknown services fail before build or infrastructure access', () => {
  const result = spawnSync(process.execPath, ['scripts/dev.mjs', 'account', 'chat'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /지원하지 않는 서비스: chat/);
});

for (const failure of [false, true]) {
  test(`launcher ${failure ? 'stops on build failure' : 'runs services concurrently and cleans up on SIGTERM'}`, { timeout: 15000 }, async () => {
    const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'ggt-dev-')));
    mkdirSync(path.join(root, 'scripts'));
    copyFileSync(new URL('./dev.mjs', import.meta.url), path.join(root, 'scripts/dev.mjs'));
    const events = path.join(root, 'events');
    writeFileSync(path.join(root, 'pnpm.cjs'), `
      const fs = require('node:fs');
      const args = process.argv.slice(2);
      fs.appendFileSync(${JSON.stringify(events)}, JSON.stringify(args) + '\\n');
      if (args[0] === 'build:workspaces') process.exit(${failure ? 2 : 0});
      if (args.includes('start:prod')) {
        fs.appendFileSync(${JSON.stringify(events)}, 'pid:' + process.pid + '\\n');
        setInterval(() => {}, 1000);
      }
    `);
    const child = spawn(process.execPath, [path.join(root, 'scripts/dev.mjs'), 'account', 'match'], { stdio: 'pipe', env: { ...process.env, npm_execpath: path.join(root, 'pnpm.cjs') } });
    const exited = new Promise(resolve => child.once('exit', code => resolve(code)));
    let output = '';
    child.stderr.on('data', data => { output += data; });
    try {
      if (failure) {
        assert.equal(await exited, 1);
        assert.match(output, /build:workspaces/);
        assert.equal(readFileSync(events, 'utf8').trim().split('\n').length, 1);
      } else {
        let lines = [];
        for (let attempt = 0; attempt < 100; attempt++) {
          try { lines = readFileSync(events, 'utf8').trim().split('\n'); } catch {}
          if (lines.filter(line => line.startsWith('pid:')).length === 2) break;
          await delay(50);
        }
        const pids = lines.filter(line => line.startsWith('pid:')).map(line => Number(line.slice(4)));
        assert.equal(pids.length, 2, output);
        const commands = lines.filter(line => line.startsWith('[')).map(JSON.parse);
        assert.deepEqual(commands[0], ['build:workspaces']);
        assert.equal(commands.slice(1).every(args => args[2] === 'start:prod'), true);
        assert.equal(commands.length, 3, 'starting apps must not provision or migrate infrastructure');
        child.kill('SIGTERM');
        assert.equal(await exited, 143);
        for (const pid of pids) assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
      }
    } finally {
      child.kill('SIGTERM');
      rmSync(root, { recursive: true, force: true });
    }
  });
}
