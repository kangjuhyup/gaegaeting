import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('pins the approved Node 24 runtime', async () => {
  const nvmrc = (await readFile(new URL('.nvmrc', root), 'utf8')).trim();
  const pkg = JSON.parse(
    await readFile(new URL('package.json', root), 'utf8'),
  );

  assert.equal(nvmrc, '24.13.1');
  assert.equal(pkg.engines.node, '>=24.13.1 <25');
  assert.equal(pkg.packageManager, 'pnpm@10.34.5');
});
