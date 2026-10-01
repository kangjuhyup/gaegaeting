import { pathToFileURL } from 'node:url';
import { config } from 'dotenv';
import { OidcDiscoveryCache } from '../auth/oidc-discovery.js';
import { OpaqueTokenIntrospector } from '../auth/introspection-client.js';
import { resolveApiAudience, resolveOidcRuntimeConfig } from '../auth/oidc-runtime-config.js';
import { createEdgeAuthzServer } from './server.js';

config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Required environment variable is missing: ${name}`);
  return value;
}

export function startEdgeAuthz() {
  const oidc = resolveOidcRuntimeConfig(process.env);
  const discovery = new OidcDiscoveryCache(oidc.discoveryUrl, oidc.issuer, fetch, {
    allowInsecureLoopbackHttp: oidc.allowInsecureLoopbackHttp,
    allowedInsecureHttpHosts: oidc.insecureHttpAllowedHosts,
  });
  const introspector = new OpaqueTokenIntrospector(discovery, fetch, {
    clientId: requireEnv('OIDC_INTROSPECTION_CLIENT_ID'),
    clientSecret: requireEnv('OIDC_INTROSPECTION_CLIENT_SECRET'),
    expectedIssuer: oidc.issuer,
    expectedAudience: resolveApiAudience(process.env),
    timeoutMs: Number(process.env.OIDC_INTROSPECTION_TIMEOUT_MS ?? 2_000),
  });
  const port = Number(process.env.EDGE_AUTHZ_PORT ?? 4010);
  const host = process.env.EDGE_AUTHZ_HOST ?? '127.0.0.1';
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid EDGE_AUTHZ_PORT');
  const server = createEdgeAuthzServer(introspector, requireEnv('EDGE_AUTH_ASSERTION_SECRET'));
  server.listen(port, host, () => console.log(`Edge authorization listening on ${host}:${port}`));
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startEdgeAuthz();
}
