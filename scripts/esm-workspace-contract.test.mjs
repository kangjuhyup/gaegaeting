import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const packagesRoot = path.join(root, 'packages');
const allowedRelativeExtensions = ['.js', '.json', '.mjs', '.cjs', '.node'];

async function discoverPackages(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const manifestEntry = entries.find(entry => entry.isFile() && entry.name === 'package.json');
  if (manifestEntry) {
    return [{ directory, manifest: path.join(directory, manifestEntry.name) }];
  }

  const packages = [];
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== 'dist' && entry.name !== 'node_modules') {
      packages.push(...await discoverPackages(path.join(directory, entry.name)));
    }
  }
  return packages;
}

async function discoverTypeScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'dist' || entry.name === 'node_modules') continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await discoverTypeScriptFiles(target));
    if (entry.isFile() && entry.name.endsWith('.ts')) files.push(target);
  }
  return files;
}

function moduleSpecifiers(source) {
  const specifiers = [];
  const pattern = /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(pattern)) specifiers.push(match[1]);
  return specifiers;
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function readTsconfig(file) {
  const source = await readFile(file, 'utf8');
  const parsed = ts.parseConfigFileTextToJson(file, source);
  assert.equal(parsed.error, undefined, `${path.relative(root, file)}: valid tsconfig`);
  return parsed.config;
}

test('active workspaces declare native ESM package and compiler boundaries', async () => {
  const rootTsconfig = await readTsconfig(path.join(root, 'tsconfig.json'));
  assert.equal(rootTsconfig.compilerOptions.module, 'NodeNext', 'root module');
  assert.equal(rootTsconfig.compilerOptions.moduleResolution, 'NodeNext', 'root moduleResolution');
  assert.equal(rootTsconfig.compilerOptions.target, 'ES2022', 'root target');
  assert.equal(rootTsconfig.compilerOptions.verbatimModuleSyntax, true, 'root verbatimModuleSyntax');
  assert.deepEqual(
    Object.keys(rootTsconfig.compilerOptions.paths ?? {}).filter(alias => alias.startsWith('@')),
    [],
    'root compiler-only path aliases are not runtime-resolvable',
  );

  for (const workspace of await discoverPackages(packagesRoot)) {
    const relativeManifest = path.relative(root, workspace.manifest);
    const manifest = JSON.parse(await readFile(workspace.manifest, 'utf8'));
    assert.equal(manifest.type, 'module', `${relativeManifest}: type`);

    if (manifest.main || manifest.types || manifest.name.startsWith('@core/')) {
      assert.ok(manifest.exports?.['.'], `${relativeManifest}: exports`);
    }

    const tsconfigPath = path.join(workspace.directory, 'tsconfig.json');
    const tsconfig = await readTsconfig(tsconfigPath);
    const compilerOnlyAliases = Object.keys(tsconfig.compilerOptions?.paths ?? {})
      .filter(alias => alias.startsWith('@'));
    assert.deepEqual(
      compilerOnlyAliases,
      [],
      `${relativeManifest}: compiler-only path aliases are not runtime-resolvable`,
    );
    if (tsconfig.compilerOptions?.module) {
      assert.equal(tsconfig.compilerOptions.module, 'NodeNext', `${relativeManifest}: module`);
    }
    if (tsconfig.compilerOptions?.moduleResolution) {
      assert.equal(tsconfig.compilerOptions.moduleResolution, 'NodeNext', `${relativeManifest}: moduleResolution`);
    }
  }
});

test('active TypeScript sources use ESM-resolvable specifiers', async () => {
  const violations = [];

  for (const workspace of await discoverPackages(packagesRoot)) {
    for (const file of await discoverTypeScriptFiles(workspace.directory)) {
      const source = await readFile(file, 'utf8');
      const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
      const visit = node => {
        if (
          ts.isCallExpression(node)
          && ts.isIdentifier(node.expression)
          && node.expression.text === 'require'
        ) {
          violations.push(`${path.relative(root, file)}: CommonJS require()`);
        }
        if (
          ts.isPropertyAccessExpression(node)
          && ts.isIdentifier(node.expression)
          && node.expression.text === 'require'
          && node.name.text === 'main'
        ) {
          violations.push(`${path.relative(root, file)}: CommonJS require.main`);
        }
        if (
          ts.isPropertyAccessExpression(node)
          && ts.isIdentifier(node.expression)
          && node.expression.text === 'module'
          && node.name.text === 'exports'
        ) {
          violations.push(`${path.relative(root, file)}: CommonJS module.exports`);
        }
        if (ts.isIdentifier(node) && ['__dirname', '__filename'].includes(node.text)) {
          violations.push(`${path.relative(root, file)}: CommonJS global ${node.text}`);
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
      for (const specifier of moduleSpecifiers(source)) {
        if (specifier.startsWith('@app/')) {
          violations.push(`${path.relative(root, file)}: private alias ${specifier}`);
        }
        if (
          (specifier.startsWith('./') || specifier.startsWith('../'))
          && !allowedRelativeExtensions.some(extension => specifier.endsWith(extension))
        ) {
          violations.push(`${path.relative(root, file)}: extensionless ${specifier}`);
        }
        if ((specifier.startsWith('./') || specifier.startsWith('../')) && specifier.endsWith('.js')) {
          const emittedTarget = path.resolve(path.dirname(file), specifier);
          const sourceTarget = `${emittedTarget.slice(0, -3)}.ts`;
          const indexTarget = path.join(emittedTarget.slice(0, -3), 'index.ts');
          if (!await exists(sourceTarget) && await exists(indexTarget)) {
            violations.push(`${path.relative(root, file)}: directory import ${specifier}`);
          }
        }
      }
    }
  }

  assert.deepEqual(violations, []);
});
