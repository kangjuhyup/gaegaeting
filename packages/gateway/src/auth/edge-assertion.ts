import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { ExternalPrincipal } from './introspection-client.js';

export const EDGE_ASSERTION_HEADER = 'x-gaegaeting-edge-assertion';
const ISSUER = 'gaegaeting-ext-authz';
const AUDIENCE = 'gaegaeting-gateway';
const MAX_AGE_SECONDS = 30;

type Payload = {
  iss: string;
  aud: string;
  tenant_id: string;
  auth_issuer: string;
  sub: string;
  scope: string[];
  roles?: string[];
  token_hash: string;
  iat: number;
  exp: number;
};

function tokenHash(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('base64url');
}

function signature(payload: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(payload, 'utf8').digest();
}

export function createEdgeAssertion(
  principal: ExternalPrincipal,
  token: string,
  secret: string,
  now = Math.floor(Date.now() / 1000),
): string {
  if (secret.length < 32 || !token) throw new Error('Invalid edge assertion configuration');
  const payload: Payload = {
    iss: ISSUER,
    aud: AUDIENCE,
    tenant_id: principal.tenantId,
    auth_issuer: principal.issuer,
    sub: principal.subject,
    scope: principal.scopes,
    ...(principal.roles === undefined ? {} : { roles: principal.roles }),
    token_hash: tokenHash(token),
    iat: now,
    exp: Math.min(principal.expiresAt, now + MAX_AGE_SECONDS),
  };
  if (payload.exp <= now) throw new Error('Inactive token');
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${signature(encoded, secret).toString('base64url')}`;
}

export function verifyEdgeAssertion(
  assertion: string,
  token: string,
  secret: string,
  now = Math.floor(Date.now() / 1000),
): Pick<ExternalPrincipal, 'issuer' | 'tenantId' | 'subject' | 'scopes' | 'roles'> {
  try {
    if (secret.length < 32 || !token || assertion.length > 8192) throw new Error();
    const parts = assertion.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error();
    const expected = signature(parts[0], secret);
    const received = Buffer.from(parts[1], 'base64url');
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      throw new Error();
    }
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as Partial<Payload>;
    const expectedHash = Buffer.from(tokenHash(token));
    const receivedHash = Buffer.from(payload.token_hash ?? '');
    if (
      payload.iss !== ISSUER ||
      payload.aud !== AUDIENCE ||
      typeof payload.tenant_id !== 'string' || !payload.tenant_id ||
      typeof payload.auth_issuer !== 'string' || !payload.auth_issuer ||
      typeof payload.sub !== 'string' || !payload.sub ||
      !Array.isArray(payload.scope) || !payload.scope.every((scope) => typeof scope === 'string' && scope !== '') ||
      (payload.roles !== undefined && (!Array.isArray(payload.roles) || payload.roles.length > 64 ||
        !payload.roles.every(role => typeof role === 'string' && role.trim() !== '' && role.length <= 64))) ||
      !Number.isInteger(payload.iat) || !Number.isInteger(payload.exp) ||
      payload.iat > now || payload.exp <= now ||
      payload.exp - payload.iat > MAX_AGE_SECONDS ||
      receivedHash.length !== expectedHash.length ||
      !timingSafeEqual(receivedHash, expectedHash)
    ) throw new Error();
    return { issuer: payload.auth_issuer, tenantId: payload.tenant_id, subject: payload.sub, scopes: payload.scope, ...(payload.roles === undefined ? {} : { roles: payload.roles }) };
  } catch {
    throw new Error('Invalid edge authentication assertion');
  }
}
