import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const self = 'scripts/orm-removal-contract.test.mjs';
const activeExtensions = new Set([
  '.cjs',
  '.js',
  '.json',
  '.mjs',
  '.ts',
  '.yaml',
  '.yml',
]);
const forbidden = ['typeorm', '@nestjs/typeorm'];

function trackedFiles() {
  const result = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.split('\n').filter(Boolean);
}

function isActiveFile(file) {
  if (file === self || file === 'pnpm-lock.yaml') return file === 'pnpm-lock.yaml';
  if (file.startsWith('docs/') || file.includes('/dist/')) return false;
  return activeExtensions.has(path.extname(file));
}

test('active repository has no retired ORM dependency or runtime path', async () => {
  const violations = [];

  for (const file of trackedFiles()) {
    if (!isActiveFile(file)) continue;

    let content;
    try {
      content = (await readFile(path.join(root, file), 'utf8')).toLowerCase();
    } catch (error) {
      if (error?.code === 'ENOENT') continue;
      throw error;
    }
    const normalizedPath = file.toLowerCase();
    if (file !== self && forbidden.some(term => normalizedPath.includes(term))) {
      violations.push(`${file}: forbidden path`);
    }
    if (forbidden.some(term => content.includes(term))) {
      violations.push(`${file}: forbidden content`);
    }
  }

  assert.deepEqual(violations, []);
});
