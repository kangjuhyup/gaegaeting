import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { probe, devIssuer, validateDiscovery } from './account-mobile-auth-readiness.mjs';
const client = JSON.parse(await readFile(new URL('../docs/contracts/account-mobile-native-client.dev.json', import.meta.url), 'utf8'));
const metadata = { issuer: devIssuer, authorization_endpoint: `${devIssuer}/auth`, code_challenge_methods_supported: ['S256'] };
function run(second) {
  const calls = [];
  return { calls, result: probe({ issuer: devIssuer, client, fetchImpl: async (url, options) => {
    calls.push({ url: String(url), options });
    return calls.length === 1 ? Response.json(metadata) : second;
  } }) };
}
test('unavailable discovery is never treated as a registered client', async () => {
  const result = await probe({ issuer: devIssuer, client, fetchImpl: async () => new Response('Forbidden', { status: 403 }) });
  assert.equal(result.outcome, 'discovery_unavailable');
  assert.equal(result.authorizationStatus, null);
});
test('rejects issuer mismatch, remote authorization endpoint and missing S256', () => {
  for (const patch of [{ issuer: 'https://other.example' }, { authorization_endpoint: 'https://other.example/auth' },
    { code_challenge_methods_supported: ['plain'] }]) {
    assert.throws(() => validateDiscovery({ ...metadata, ...patch }, devIssuer));
  }
});
test('classifies invalid_client without exposing response contents', async () => {
  const { result, calls } = run(new Response('invalid_client private-session-marker', { status: 400 }));
  const output = await result;
  assert.equal(output.outcome, 'invalid_client');
  assert.ok(!JSON.stringify(output).includes('private-session-marker'));
  const url = new URL(calls[1].url);
  assert.equal(url.searchParams.get('client_id'), 'gaegaeting-mobile');
  assert.equal(url.searchParams.get('resource'), client.allowedResources[0]);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(!url.searchParams.has('client_secret'));
});
test('interaction redirect is not followed and never proves user login', async () => {
  const { result, calls } = run(new Response(null, { status: 302, headers: {
    location: `${client.externalInteractionUiUrl}/private-session-marker?code=secret-marker&state=secret-marker`,
  } }));
  const output = await result;
  assert.equal(output.outcome, 'interaction_reachable');
  assert.equal(output.userLoginE2E, false);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(call => call.options.redirect === 'manual'));
  assert.ok(!JSON.stringify(output).includes('marker'));
});
test('unknown redirect destination is unverified', async () => {
  const { result } = run(new Response(null, { status: 302, headers: { location: 'https://other.example/interaction' } }));
  assert.equal((await result).outcome, 'unverified_redirect');
});
