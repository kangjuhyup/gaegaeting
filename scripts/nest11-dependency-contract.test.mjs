import assert from 'node:assert/strict';
import { glob, readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const frameworkPackages = [
  '@nestjs/common',
  '@nestjs/core',
  '@nestjs/platform-express',
  '@nestjs/testing',
];

async function workspaceManifests() {
  const files = [];
  for await (const file of glob(
    ['package.json', 'packages/*/package.json', 'packages/core/*/package.json'],
    { cwd: root },
  )) {
    files.push(file);
  }
  return files.sort();
}

test('all Nest framework packages target NestJS 11', async () => {
  for (const file of await workspaceManifests()) {
    const manifestUrl = new URL(file, root);
    const pkg = JSON.parse(await readFile(manifestUrl, 'utf8'));
    for (const section of [
      'peerDependencies',
      'devDependencies',
      'dependencies',
    ]) {
      const dependencies = pkg[section] ?? {};

      for (const name of frameworkPackages) {
        if (dependencies[name]) {
          assert.match(
            dependencies[name],
            /\^11\./,
            `${file}: ${section}.${name}`,
          );
        }
      }

      if (dependencies['@nestjs/axios']) {
        assert.doesNotMatch(
          dependencies['@nestjs/axios'],
          /\^3\./,
          `${file}: ${section}.@nestjs/axios`,
        );
      }
      if (dependencies['@nestjs/swagger']) {
        assert.doesNotMatch(
          dependencies['@nestjs/swagger'],
          /\^7\./,
          `${file}: ${section}.@nestjs/swagger`,
        );
      }
    }
  }
});
