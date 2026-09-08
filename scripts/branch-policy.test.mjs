import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import policy from '../.github/scripts/branch-policy.cjs';

function result(head, base, headRepo = 'kangjuhyup/gaegaeting') {
  return policy.evaluatePullRequest({
    head: { ref: head, repo: { full_name: headRepo } },
    base: { ref: base, repo: { full_name: 'kangjuhyup/gaegaeting' } },
  });
}

for (const domain of policy.domains) {
  test(`${domain}: domain work, release and main synchronization are allowed`, () => {
    for (const type of ['feat', 'fix', 'refactor', 'chore', 'docs', 'test']) {
      assert.equal(result(`${type}/${domain}/some-work`, `dev/${domain}`).allowed, true);
    }
    for (const [head, base] of [
      [`release/${domain}/1.2.0`, 'main'],
      ['main', `dev/${domain}`],
      ['main', `release/${domain}/1.2.0`],
      [`fix/${domain}/release-bug`, `release/${domain}/1.2.0`],
      [`release/${domain}/1.2.0`, `dev/${domain}`],
    ]) assert.equal(result(head, base).allowed, true, `${head} -> ${base}`);
  });
}

for (const [head, base] of [
  ['feat/account/profile', 'main'],
  ['dev/account', 'main'],
  ['feat/account/profile', 'dev/match'],
  ['dev/account', 'dev/match'],
  ['dev/core', 'dev/account'],
  ['feat/core/helpers', 'dev/account'],
  ['release/account/1.0.0', 'dev/match'],
  ['fix/account/bug', 'release/match/1.0.0'],
  ['feat/account/feature', 'release/account/1.0.0'],
  ['dev/account', 'release/account/1.0.0'],
  ['release/account/1.0.0', 'release/account/1.1.0'],
  ['main', 'main'],
  ['feat/account/a', 'feat/account/b'],
  ['infra/feat/auth-service-app', 'main'],
  ['feat/account/a', 'develop'],
  ['release/account/v1.0.0', 'main'],
  ['release/account/01.0.0', 'main'],
  ['release/account/1.0.0-rc.1', 'main'],
  ['release/unknown/1.0.0', 'main'],
  ['feat/account/has_underscore', 'dev/account'],
  ['feat/account/nested/name', 'dev/account'],
]) {
  test(`reject ${head} -> ${base}`, () => assert.equal(result(head, base).allowed, false));
}

test('a fork cannot impersonate an internal release or main branch', () => {
  assert.equal(result('release/account/1.0.0', 'main', 'other/gaegaeting').allowed, false);
  assert.equal(result('main', 'dev/account', 'other/gaegaeting').allowed, false);
});

test('missing pull request metadata fails closed', () => {
  assert.equal(policy.evaluatePullRequest(undefined).allowed, false);
  assert.equal(policy.evaluatePullRequest({ head: { ref: 'release/account/1.0.0' }, base: { ref: 'main' } }).allowed, false);
});

test('workflow command fails for rejected PRs and succeeds for permitted PRs', () => {
  const directory = mkdtempSync(join(tmpdir(), 'gaegaeting-branch-policy-'));
  try {
    const eventPath = join(directory, 'event.json');
    for (const [head, expectedExit] of [['release/account/1.0.0', 0], ['feat/account/profile', 1]]) {
      writeFileSync(eventPath, JSON.stringify({ pull_request: {
        head: { ref: head, repo: { full_name: 'kangjuhyup/gaegaeting' } },
        base: { ref: 'main', repo: { full_name: 'kangjuhyup/gaegaeting' } },
      } }));
      const run = spawnSync(process.execPath, [new URL('../.github/scripts/branch-policy.cjs', import.meta.url).pathname], {
        env: { ...process.env, GITHUB_EVENT_PATH: eventPath }, encoding: 'utf8',
      });
      assert.equal(run.status, expectedExit, run.stderr);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('main requires squash without disabling merge-based dev synchronization', () => {
  const read = (name) => JSON.parse(readFileSync(new URL(`../.github/rulesets/${name}.json`, import.meta.url)));
  const main = read('main');
  const integration = read('integration');
  assert.deepEqual(main.rules.find(rule => rule.type === 'pull_request').parameters.allowed_merge_methods, ['squash']);
  assert.equal(integration.rules.find(rule => rule.type === 'pull_request').parameters.allowed_merge_methods, undefined);
  for (const ruleset of [main, integration]) assert.deepEqual(ruleset.bypass_actors, []);
  const check = integration.rules.find(rule => rule.type === 'required_status_checks').parameters;
  assert.deepEqual(check.required_status_checks, [{ context: 'branch-policy', integration_id: 15368 }]);
  assert.equal(check.strict_required_status_checks_policy, true);
});
