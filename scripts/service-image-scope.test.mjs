import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { affectedServices, pendingPullRequestFiles, planImages, services } from './service-image-scope.mjs';

const packages = [
  { dir: 'packages/account', name: 'account', dependencies: ['@core/auth', '@core/storage'] },
  { dir: 'packages/match', name: 'match', dependencies: ['@core/auth'] },
  { dir: 'packages/chat', name: 'chat', dependencies: ['@core/auth'] },
  { dir: 'packages/gateway', name: 'gateway', dependencies: ['@core/assertion'] },
  { dir: 'packages/core/auth', name: '@core/auth', dependencies: ['@core/assertion'] },
  { dir: 'packages/core/assertion', name: '@core/assertion', dependencies: [] },
  { dir: 'packages/core/storage', name: '@core/storage', dependencies: [] },
  { dir: 'packages/integration-ui', name: 'user-ui', dependencies: ['ui-common'] },
  { dir: 'packages/admin-ui', name: 'admin-ui', dependencies: ['ui-common'] },
  { dir: 'packages/ui-common', name: 'ui-common', dependencies: [] },
];
const plan = (files, domain = 'core', verifyService) => planImages({ files, packages, domain, verifyService });

test('Match feature publishes only Match; independent UI and Account changes stay scoped', () => {
  assert.deepEqual(plan(['packages/match/src/feed/status.ts'], 'match').publishServices, ['match']);
  assert.deepEqual(plan(['packages/chat/src/message/domain/model/message.ts']).publishServices, ['chat']);
  assert.deepEqual(plan(['packages/account/src/user/model.ts'], 'account').services, ['account']);
  assert.deepEqual(plan(['packages/integration-ui/src/App.tsx']).publishServices, ['integration-ui']);
});

test('shared UI and server changes select both UI images; gateway selects its two runtimes', () => {
  for (const file of ['packages/ui-common/src/InteractionPage.tsx', 'deploy/docker/ui-server.mjs']) {
    assert.deepEqual(plan([file]).services, ['integration-ui', 'admin-ui']);
  }
  assert.deepEqual(plan(['packages/gateway/src/edge-authz/main.ts'], 'gateway').publishServices, ['gateway', 'edge-authz']);
});

test('workspace dependencies select transitive consumers, including removed dependency edges', () => {
  assert.deepEqual(affectedServices(['packages/core/assertion/src/key.ts'], packages), ['account', 'match', 'chat', 'gateway', 'edge-authz']);
  assert.deepEqual(affectedServices(['packages/core/storage/src/client.ts'], packages), ['account']);
  const changed = [...packages, { dir: 'packages/account', name: 'account', dependencies: [] }];
  assert.deepEqual(affectedServices(['packages/core/storage/src/client.ts'], changed), ['account']);
});

test('docs, tests and CI-only changes perform verification without image builds or publication', () => {
  assert.deepEqual(plan(['docs/image-delivery.md', '.github/workflows/service-images.yml', 'scripts/service-image-scope.mjs', 'scripts/service-image-scope.test.mjs', 'packages/match/test/feed.spec.ts', 'packages/match/src/feed/status.spec.ts', 'packages/account/README.md', 'CHANGELOG.md']).services, []);
});

test('unknown runtime and shared build inputs fail safely by selecting every service', () => {
  for (const file of ['pnpm-lock.yaml', '.nvmrc', 'deploy/docker/Dockerfile', 'scripts/build.mjs', 'packages/new-runtime/src/main.ts']) {
    assert.deepEqual(plan([file]).publishServices, services);
  }
  assert.throws(() => plan(['pnpm-lock.yaml'], 'match'), /cross the branch domain/);
  assert.throws(() => plan(['packages/account/src/main.ts'], 'match'), /cross the branch domain/);
  assert.throws(() => planImages({ files: [], packages, domain: undefined }), /Unknown image domain/);
});

test('explicit verification builds one unchanged image without publishing it', () => {
  assert.deepEqual(plan(['.github/workflows/service-images.yml'], 'core', 'match'), { domain: 'core', services: ['match'], publishServices: [] });
  assert.throws(() => plan([], 'match', 'account'), /Invalid verification service/);
  assert.throws(() => plan([], 'core', 'unknown'), /Invalid verification service/);
});

test('main carryover, newer main changes, squash-equivalent files and dev sync are excluded', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'gaegaeting-image-scope-'));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const commit = message => { git('-c', 'user.name=Image scope test', '-c', 'user.email=image-scope@example.test', 'commit', '--no-gpg-sign', '-am', message); return git('rev-parse', 'HEAD'); };
  try {
    git('init', '-b', 'main');
    git('config', 'user.name', 'Image scope test');
    git('config', 'user.email', 'image-scope@example.test');
    await writeFile(join(cwd, 'ui.txt'), 'initial');
    await writeFile(join(cwd, 'match.txt'), 'initial');
    git('add', '.');
    const base = commit('initial');
    await writeFile(join(cwd, 'ui.txt'), 'released UI one');
    const released = commit('core release one');
    git('switch', '-c', 'feature', released);
    await writeFile(join(cwd, 'match.txt'), 'match feature');
    const head = commit('match feature');
    git('switch', 'main');
    await writeFile(join(cwd, 'ui.txt'), 'released UI two');
    commit('core release two');
    // Two-tree comparison alone would falsely include ui.txt from older main.
    assert.deepEqual(pendingPullRequestFiles(cwd, base, head, 'main'), ['match.txt']);
    git('merge', '--squash', 'feature');
    // Restore the newer main UI when preparing the released squash equivalent.
    await writeFile(join(cwd, 'ui.txt'), 'released UI two');
    commit('match squash release');
    assert.deepEqual(pendingPullRequestFiles(cwd, base, head, 'main'), []);
    const main = git('rev-parse', 'main');
    assert.deepEqual(pendingPullRequestFiles(cwd, base, main, 'main'), []);
  } finally { await rm(cwd, { recursive: true, force: true }); }
});
