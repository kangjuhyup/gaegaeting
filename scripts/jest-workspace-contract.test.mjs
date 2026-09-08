import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');

async function findPackageManifests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const manifests = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'dist' || entry.name === 'node_modules') {
      continue;
    }

    const child = path.join(directory, entry.name);
    try {
      await readFile(path.join(child, 'package.json'));
      manifests.push(path.join(child, 'package.json'));
    } catch {
      manifests.push(...await findPackageManifests(child));
    }
  }

  return manifests;
}

test('every ts-jest workspace provides its jest-util peer', async () => {
  const manifests = await findPackageManifests(path.join(root, 'packages'));
  const missing = [];

  for (const manifestPath of manifests) {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    if (manifest.devDependencies?.['ts-jest'] && !manifest.devDependencies?.['jest-util']) {
      missing.push(path.relative(root, manifestPath));
    }
  }

  assert.deepEqual(missing, []);
});

test('every workspace loading dotenv in Jest declares it', async () => {
  const manifests = await findPackageManifests(path.join(root, 'packages'));
  const missing = [];

  for (const manifestPath of manifests) {
    const packageDirectory = path.dirname(manifestPath);
    let setup = '';
    try {
      setup = await readFile(path.join(packageDirectory, 'jest.setup.cjs'), 'utf8');
    } catch {
      continue;
    }

    if (!setup.includes("require('dotenv')")) {
      continue;
    }

    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const declared = {
      ...manifest.peerDependencies,
      ...manifest.dependencies,
      ...manifest.devDependencies,
    };
    if (!declared.dotenv) {
      missing.push(path.relative(root, manifestPath));
    }
  }

  assert.deepEqual(missing, []);
});

test('workspace tests allow packages without test files', async () => {
  const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const command = manifest.scripts['test:workspaces'];

  assert.match(command, /--passWithNoTests/);
  assert.match(command, /--runInBand/);
  assert.match(command, /--no-cache/);
  assert.equal(command.split(/\s+/).some(token => /^-[^-]*p/.test(token)), false);
});

test('Jest workspace scripts enable the ESM VM runtime', async () => {
  const manifests = await findPackageManifests(path.join(root, 'packages'));
  const missing = [];

  for (const manifestPath of manifests) {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    for (const [name, command] of Object.entries(manifest.scripts ?? {})) {
      if (name.startsWith('test') && command.includes('jest') && !command.includes('--experimental-vm-modules')) {
        missing.push(`${path.relative(root, manifestPath)}#${name}`);
      }
    }
  }

  assert.deepEqual(missing, []);
});
