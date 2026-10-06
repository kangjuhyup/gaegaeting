// Anonymous GET-only reachability probe. Never follows a redirect, logs bodies,
// logs credentials, or exchanges a code; it is not a user-login E2E test.
import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const devIssuer = 'https://auth.rvkang.app/t/gaegaeting-dev/oidc';
const errors = new Set(['invalid_client', 'invalid_scope', 'invalid_request',
  'invalid_redirect_uri', 'invalid_target', 'access_denied', 'unauthorized_client']);

export function validateDiscovery(metadata, issuer) {
  const expected = new URL(issuer);
  if (expected.protocol !== 'https:' || expected.username || expected.password || expected.search || expected.hash
    || metadata.issuer !== issuer || !metadata.code_challenge_methods_supported?.includes('S256')) {
    throw new Error('discovery_contract_mismatch');
  }
  const endpoint = new URL(metadata.authorization_endpoint);
  if (endpoint.origin !== expected.origin || endpoint.username || endpoint.password || endpoint.search || endpoint.hash
    || !endpoint.pathname.startsWith(`${expected.pathname}/`)) {
    throw new Error('authorization_endpoint_mismatch');
  }
  return endpoint;
}

export async function probe({ issuer, client, fetchImpl = fetch }) {
  const result = { checkedAt: new Date().toISOString(), clientId: client.clientId,
    discoveryStatus: null, authorizationStatus: null, outcome: 'unverified', userLoginE2E: false };
  const get = url => fetchImpl(url, { redirect: 'manual', signal: AbortSignal.timeout(15000),
    headers: { accept: 'application/json' } });
  try {
    const discovery = await get(`${issuer}/.well-known/openid-configuration`);
    result.discoveryStatus = discovery.status;
    if (discovery.status !== 200) return { ...result, outcome: 'discovery_unavailable' };
    const endpoint = validateDiscovery(await discovery.json(), issuer);
    const verifier = randomBytes(32).toString('base64url');
    const params = new URLSearchParams({ client_id: client.clientId, response_type: 'code',
      redirect_uri: client.redirectUris[0], scope: client.scope, resource: client.allowedResources[0],
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256', state: randomBytes(24).toString('base64url'),
      nonce: randomBytes(24).toString('base64url') });
    endpoint.search = params.toString();
    const response = await get(endpoint);
    result.authorizationStatus = response.status;
    const location = response.headers.get('location');
    if (location) {
      const target = new URL(location, endpoint);
      const error = target.searchParams.get('error');
      if (error) return { ...result, outcome: errors.has(error) ? error : 'authorization_error' };
      const ui = new URL(client.externalInteractionUiUrl);
      if ([302, 303].includes(response.status) && target.origin === ui.origin
        && (target.pathname === ui.pathname || target.pathname.startsWith(`${ui.pathname}/`))) {
        return { ...result, outcome: 'interaction_reachable' };
      }
      return { ...result, outcome: 'unverified_redirect' };
    }
    const body = await response.text();
    // Provider error pages are classified only; never expose their body/query/uid.
    const error = [...errors].find(value => new RegExp(`\\b${value}\\b`).test(body));
    return { ...result, outcome: error ?? 'authorization_unclassified' };
  } catch {
    return { ...result, outcome: 'network_or_contract_error' };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const client = JSON.parse(await readFile(new URL('../docs/contracts/account-mobile-native-client.dev.json', import.meta.url), 'utf8'));
  const result = await probe({ issuer: devIssuer, client });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.outcome === 'interaction_reachable' ? 0 : 2;
}
