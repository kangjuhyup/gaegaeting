import { pathToFileURL } from 'node:url';

const USER_SCOPES = 'openid profile email account:read account:write match:read match:write tenant_roles';

function required(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function serviceSecret(env, name) {
  const value = required(env, name);
  if (value.length < 32) throw new Error(`${name} must be at least 32 characters`);
  return value;
}

function validUrl(value, { interaction = false, production = process.env.NODE_ENV === 'production' } = {}) {
  const url = new URL(value);
  if (url.username || url.password || url.hash ||
      (url.protocol !== 'https:' && !(production === false && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) {
    throw new Error('Invalid Auth client URL');
  }
  if (interaction && !url.pathname.endsWith('/interaction')) throw new Error('Interaction URL must end in /interaction');
  return url.href;
}

function cookieFrom(response) {
  const cookie = (response.headers.getSetCookie?.() ?? [])
    .map(value => value.split(';', 1)[0]).filter(Boolean).join('; ');
  if (!cookie.includes('admin_session=')) throw new Error('Auth admin session unavailable');
  return cookie;
}

async function checked(response, label) {
  if (!response.ok) throw new Error(`${label} failed (HTTP ${response.status})`);
  return response;
}

async function list(base, path, cookie, fetchImpl) {
  return (await (await checked(await fetchImpl(`${base}${path}?limit=100`, { headers: { cookie } }), path)).json()).items ?? [];
}

function same(actual, expected) {
  const fields = ['clientId', 'type', 'tokenEndpointAuthMethod', 'scope', 'applicationType', 'skipConsent', 'externalInteractionUiUrl'];
  const arrays = ['redirectUris', 'grantTypes', 'responseTypes', 'postLogoutRedirectUris', 'allowedResources', 'introspectionResources'];
  return actual.enabled === true && fields.every(key => (actual[key] ?? null) === (expected[key] ?? null)) &&
    arrays.every(key => JSON.stringify(actual[key] ?? []) === JSON.stringify(expected[key] ?? []));
}

export function desiredClients(env) {
  const production = env.NODE_ENV === 'production';
  const redirect = validUrl(required(env, 'GAEGAETING_WEB_REDIRECT_URI'), { production });
  const interaction = validUrl(required(env, 'GAEGAETING_INTERACTION_URL'), { interaction: true, production });
  if (new URL(redirect).origin !== new URL(interaction).origin) throw new Error('Web redirect and interaction origins must match');
  const audience = validUrl(env.OIDC_API_AUDIENCE ?? 'https://api.gaegaeting.app', { production }).replace(/\/$/, '');
  const common = { redirectUris: [], responseTypes: [], postLogoutRedirectUris: [], applicationType: 'web', skipConsent: false, allowedResources: [], introspectionResources: [] };
  return [
    { ...common, clientId: 'gaegaeting-web', name: 'Gaegaeting Web', type: 'public', redirectUris: [redirect], grantTypes: ['authorization_code'], responseTypes: ['code'], tokenEndpointAuthMethod: 'none', scope: USER_SCOPES, skipConsent: true, allowedResources: [audience], externalInteractionUiUrl: interaction },
    { ...common, clientId: 'gaegaeting-api', name: 'Gaegaeting API introspection', type: 'service', secret: serviceSecret(env, 'GAEGAETING_INTROSPECTION_CLIENT_SECRET'), grantTypes: ['client_credentials'], tokenEndpointAuthMethod: 'client_secret_basic', scope: 'openid', introspectionResources: [audience] },
    { ...common, clientId: 'gaegaeting-account-provisioner', name: 'Gaegaeting Account provisioning', type: 'service', secret: serviceSecret(env, 'GAEGAETING_PROVISIONING_CLIENT_SECRET'), grantTypes: ['client_credentials'], tokenEndpointAuthMethod: 'client_secret_basic', scope: 'auth.user.provision' },
  ];
}

export async function bootstrapGaegaetingAuth({ env = process.env, fetchImpl = fetch } = {}) {
  const base = validUrl(required(env, 'AUTH_BASE_URL'), { production: env.NODE_ENV === 'production' }).replace(/\/$/, '');
  const username = required(env, 'AUTH_ADMIN_USERNAME');
  const password = required(env, 'AUTH_ADMIN_PASSWORD');
  const tenantCode = env.AUTH_TENANT_CODE ?? 'gaegaeting';
  if (!/^gaegaeting(?:-[a-z0-9]+)*$/.test(tenantCode)) throw new Error('Only Gaegaeting tenants may be bootstrapped');
  const desired = desiredClients(env);
  const login = await checked(await fetchImpl(`${base}/admin/session`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password }),
  }), 'Auth admin login');
  const cookie = cookieFrom(login);
  const tenant = (await list(base, '/admin/tenants', cookie, fetchImpl)).find(item => item.code === tenantCode);
  if (!tenant) {
    await checked(await fetchImpl(`${base}/admin/tenants`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ code: tenantCode, name: 'Gaegaeting' }) }), 'Gaegaeting tenant creation');
  }
  const prefix = `/t/${tenantCode}/admin`;
  const scopes = await list(base, `${prefix}/scopes`, cookie, fetchImpl);
  for (const name of ['offline_access', 'account:read', 'account:write', 'match:read', 'match:write', 'auth.user.provision', 'tenant_roles']) {
    const found = scopes.find(item => item.name === name);
    if (found && !found.enabled) throw new Error(`Disabled Auth scope: ${name}`);
    if (!found) await checked(await fetchImpl(`${base}${prefix}/scopes`, {
      method: 'POST', headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ name, displayName: name, description: `Gaegaeting ${name}`, claimKeys: [], enabled: true }),
    }), `Auth scope ${name}`);
  }
  const clients = await list(base, `${prefix}/clients`, cookie, fetchImpl);
  for (const client of desired) {
    const found = clients.find(item => item.clientId === client.clientId);
    if (found) {
      if (!same(found, client)) throw new Error(`Auth client conflict: ${client.clientId}`);
      continue;
    }
    await checked(await fetchImpl(`${base}${prefix}/clients`, {
      method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(client),
    }), `Auth client ${client.clientId}`);
  }
  const metadata = await (await checked(await fetchImpl(`${base}/t/${tenantCode}/oidc/.well-known/openid-configuration`), 'Gaegaeting discovery')).json();
  if (metadata.issuer !== `${base}/t/${tenantCode}/oidc`) throw new Error('Gaegaeting issuer mismatch');
  return 'Gaegaeting Auth tenant and clients are configured';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  bootstrapGaegaetingAuth().then(message => console.log(message)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
