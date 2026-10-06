import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('only exact provider notification paths bypass user authentication to Payment', async () => {
  const envoy = await readFile(new URL('../ops/local-envoy/envoy.yaml', import.meta.url), 'utf8');
  const routes = [...envoy.matchAll(/- match: \{ (path|prefix): ([^ }]+) \}([\s\S]*?)(?=\n\s*- match:|\n\s*http_filters:)/g)]
    .map(([, kind, path, config]) => ({ kind, path, config }));
  const payment = routes.filter(route => /cluster: payment\b/.test(route.config));
  assert.deepEqual(payment.map(({ kind, path }) => [kind, path]), [
    ['path', '/payment/notifications/apple'],
    ['path', '/payment/notifications/google'],
  ]);
  for (const route of payment) assert.match(route.config, /disabled: true/);
  const gateway = routes.find(route => route.path === '/gateway/graphql');
  assert.ok(gateway);
  assert.doesNotMatch(gateway.config, /disabled: true/);
  assert.match(envoy, /failure_mode_allow: false/);
  assert.equal(routes.some(route => route.path === '/payment/graphql'), false);
});
