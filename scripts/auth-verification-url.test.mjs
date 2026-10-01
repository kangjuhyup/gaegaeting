import assert from 'node:assert/strict';
import test from 'node:test';
import { authVerificationUrl } from './auth-verification-url.mjs';

const issuer = 'https://auth.example.test/t/gaegaeting-dev/oidc';

test('Auth verification follows only tenant authorization and interaction routes', () => {
  for (const path of ['oidc/auth', 'oidc/auth/session_123', 'interaction/session_123']) {
    const url = authVerificationUrl(`/t/gaegaeting-dev/${path}?state=opaque#discard`, issuer);
    assert.equal(url.origin, 'https://auth.example.test');
    assert.equal(url.pathname, `/t/gaegaeting-dev/${path}`);
    assert.equal(url.search, '?state=opaque');
    assert.equal(url.hash, '');
  }
});

test('Auth verification rejects foreign origins, tenants and unrelated endpoints', () => {
  for (const url of [
    'https://attacker.example/t/gaegaeting-dev/oidc/auth',
    'https://user:password@auth.example.test/t/gaegaeting-dev/oidc/auth',
    '/t/gaegaeting/oidc/auth', '/t/gaegaeting-dev/provisioning/users',
    '/t/gaegaeting-dev/oidc/token', '/t/gaegaeting-dev/interaction/../admin',
    '/t/gaegaeting-dev/interaction/session%2fadmin',
  ]) assert.throws(() => authVerificationUrl(url, issuer));
});
