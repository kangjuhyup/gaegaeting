import { randomBytes, createHash } from 'node:crypto';

const issuer = process.env.OIDC_ISSUER ?? 'http://localhost:3010/t/gaegaeting/oidc';
const authOrigin = new URL(issuer).origin;
const tenantCode = /^\/t\/([a-z0-9-]+)\/oidc$/.exec(new URL(issuer).pathname)?.[1];
if (!tenantCode) throw new Error('Invalid tenant issuer');
const tenantPath = `/t/${tenantCode}/`;
function authUrl(value) {
  const parsed = new URL(value, issuer);
  if (parsed.origin !== authOrigin || !parsed.pathname.startsWith(tenantPath) || parsed.username || parsed.password) throw new Error('Unsafe Auth URL');
  // Reconstruct from the trusted origin; redirect metadata cannot choose a host.
  return `${authOrigin}${parsed.pathname}${parsed.search}`;
}
const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
const clientId = process.env.OIDC_CLIENT_ID ?? 'gaegaeting-web';
const metadata = await (await fetch(`${issuer}/.well-known/openid-configuration`)).json();
async function jsonAt(response, label) {
  try { return await response.json(); }
  catch { throw new Error(`${label} response was not JSON (HTTP ${response.status})`); }
}
if (metadata.issuer !== issuer) throw new Error('Unexpected issuer');
// This verifier targets the tenant Auth contract, whose token route is fixed.
// Never post the authorization code to a discovery-controlled destination.
const tokenEndpoint = `${issuer}/token`;
if (metadata.token_endpoint !== tokenEndpoint) throw new Error('Unexpected token endpoint');
const verifier = randomBytes(48).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');
const authorize = new URL(authUrl(metadata.authorization_endpoint));
for (const [key, value] of Object.entries({
  response_type: 'code', client_id: clientId, redirect_uri: `${webOrigin}/login`,
  scope: 'openid profile email account:read account:write match:read match:write',
  resource: process.env.OIDC_API_AUDIENCE ?? 'https://api.gaegaeting.app', code_challenge: challenge,
  code_challenge_method: 'S256', state: randomBytes(20).toString('base64url'),
  nonce: randomBytes(20).toString('base64url'), prompt: 'login',
})) authorize.searchParams.set(key, value);

const cookies = new Map();
function collect(response) {
  for (const value of response.headers.getSetCookie?.() ?? []) {
    const pair = value.split(';', 1)[0];
    const split = pair.indexOf('=');
    if (split > 0) cookies.set(pair.slice(0, split), pair.slice(split + 1));
  }
}
function cookieHeader() {
  return [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
}
let next = authorize.href;
let external;
for (let step = 0; step < 8; step++) {
  const response = await fetch(authUrl(next), { redirect: 'manual', headers: { cookie: cookieHeader() } });
  collect(response);
  const location = response.headers.get('location');
  if (!location) throw new Error(`OIDC redirect missing (HTTP ${response.status})`);
  const target = new URL(location, next);
  if (target.origin === webOrigin) { external = target; break; }
  if (target.origin !== new URL(issuer).origin) throw new Error('Unexpected OIDC redirect origin');
  next = target.href;
}
if (!external || external.pathname !== '/interaction') throw new Error('External interaction UI redirect missing');
const tenant = external.searchParams.get('tenantCode');
const uid = external.searchParams.get('uid');
const fragment = new URLSearchParams(external.hash.slice(1));
const token = fragment.get('interaction_token');
const csrf = fragment.get('csrf_token');
if (tenant !== tenantCode || !/^[A-Za-z0-9_-]+$/.test(uid ?? '') || !token || !csrf) throw new Error('Interaction bootstrap incomplete');
const base = `${new URL(issuer).origin}/t/${tenant}/interaction/${uid}`;
const headers = { cookie: cookieHeader(), origin: webOrigin, authorization: `Bearer ${token}`, 'x-interaction-csrf': csrf };
const details = await fetch(`${base}/api/details`, { headers });
const body = await jsonAt(details, 'Interaction details');
if (details.status !== 200 || body.clientId !== clientId || body.prompt !== 'login' ||
    details.headers.get('access-control-allow-origin') !== webOrigin ||
    details.headers.get('access-control-allow-credentials') !== 'true') {
  throw new Error(`Interaction details or CORS failed (HTTP ${details.status})`);
}
const invalid = await fetch(`${base}/api/login`, {
  method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
  body: JSON.stringify({ username: `missing_${randomBytes(8).toString('hex')}`, password: 'wrong-password' }),
});
if (invalid.status !== 401) throw new Error(`Invalid credentials were not rejected (HTTP ${invalid.status})`);
if (process.env.TEST_USERNAME && process.env.TEST_PASSWORD) {
  const login = await fetch(`${base}/api/login`, {
    method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ username: process.env.TEST_USERNAME, password: process.env.TEST_PASSWORD }),
  });
  collect(login);
  const result = await jsonAt(login, 'Interaction login');
  if (!login.ok || !result.redirectTo) throw new Error(`Login did not reach Auth resume (HTTP ${login.status})`);
  let callback;
  let resume = new URL(result.redirectTo, issuer);
  if (resume.origin !== new URL(issuer).origin) throw new Error('Unsafe Auth resume URL');
  for (let step = 0; step < 8; step++) {
    const response = await fetch(authUrl(resume), { redirect: 'manual', headers: { cookie: cookieHeader() } });
    collect(response);
    const location = response.headers.get('location');
    if (!location) throw new Error(`Auth resume redirect missing (HTTP ${response.status})`);
    const target = new URL(location, resume);
    if (target.origin === webOrigin) { callback = target; break; }
    if (target.origin !== new URL(issuer).origin) throw new Error('Unexpected Auth resume origin');
    resume = target;
  }
  if (!callback?.searchParams.get('code')) throw new Error('OIDC callback code missing');
  const tokenResponse = await fetch(tokenEndpoint, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code: callback.searchParams.get('code'), client_id: clientId, redirect_uri: `${webOrigin}/login`, code_verifier: verifier }),
  });
  const tokens = await jsonAt(tokenResponse, 'OIDC token');
  if (!tokenResponse.ok || !tokens.access_token || !tokens.id_token) throw new Error(`OIDC code exchange failed (HTTP ${tokenResponse.status})`);
  const gateway = await fetch(process.env.GATEWAY_GRAPHQL_URL ?? 'http://localhost:8080/gateway/graphql', {
    method: 'POST', headers: { authorization: `Bearer ${tokens.access_token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query: '{ __typename }' }),
  });
  const graph = await jsonAt(gateway, 'Gateway');
  const expectedStatus = Number(process.env.EXPECT_GATEWAY_STATUS ?? 200);
  if (gateway.status !== expectedStatus ||
      (expectedStatus === 200 && graph.data?.__typename !== 'Query') ||
      (expectedStatus === 401 && graph.error !== 'account_not_registered')) {
    throw new Error(`Unexpected Gateway login result (HTTP ${gateway.status}, ${graph.error ?? 'unknown_error'})`);
  }
  console.log(expectedStatus === 200
    ? 'Hosted UI login, OIDC code exchange, Envoy/Gateway account mapping: pass'
    : 'Hosted UI login, OIDC code exchange, unregistered subject rejection: pass');
} else {
  const abort = await fetch(`${base}/api/abort`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: '{}' });
  const aborted = await jsonAt(abort, 'Interaction abort');
  if (![200, 201].includes(abort.status) || !aborted.redirectTo ||
      new URL(aborted.redirectTo, issuer).origin !== new URL(issuer).origin) {
    throw new Error(`Interaction cancellation failed (HTTP ${abort.status})`);
  }
  console.log('Hosted UI delegation, exact-origin CORS, invalid credentials, cancellation: pass');
}
