import { createHmac, timingSafeEqual } from 'node:crypto';

const INVALID_ASSERTION = 'Invalid internal authentication assertion';

export interface AuthenticatedPrincipal {
  tenantId: string;
  subject: string;
  userId: string;
  scopes: string[];
  issuedAt: number;
  expiresAt: number;
}

export interface InternalAuthAssertionOptions {
  secret: string;
  issuer: string;
  audience: string;
  ttlSeconds?: number;
  now?: () => number;
}

interface AssertionPayload {
  iss: string;
  aud: string;
  tenant_id: string;
  sub: string;
  user_id: string;
  scope: string[];
  iat: number;
  exp: number;
}

function invalid(): never {
  throw new Error(INVALID_ASSERTION);
}

function requireText(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') invalid();
  return value;
}

function sign(encodedPayload: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(encodedPayload, 'utf8').digest();
}

export function createInternalAuthAssertion(
  principal: Omit<AuthenticatedPrincipal, 'issuedAt' | 'expiresAt'>,
  options: InternalAuthAssertionOptions,
): string {
  const secret = requireText(options.secret);
  const issuer = requireText(options.issuer);
  const audience = requireText(options.audience);
  const tenantId = requireText(principal.tenantId);
  const subject = requireText(principal.subject);
  const userId = requireText(principal.userId);
  const ttlSeconds = options.ttlSeconds ?? 30;
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 60) invalid();

  const issuedAt = (options.now ?? (() => Math.floor(Date.now() / 1000)))();
  if (!Number.isInteger(issuedAt)) invalid();

  const payload: AssertionPayload = {
    iss: issuer,
    aud: audience,
    tenant_id: tenantId,
    sub: subject,
    user_id: userId,
    scope: Array.isArray(principal.scopes)
      ? principal.scopes.filter((scope): scope is string => typeof scope === 'string' && scope !== '')
      : [],
    iat: issuedAt,
    exp: issuedAt + ttlSeconds,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encodedPayload}.${sign(encodedPayload, secret).toString('base64url')}`;
}

export function verifyInternalAuthAssertion(
  assertion: string,
  options: InternalAuthAssertionOptions,
): AuthenticatedPrincipal {
  try {
    const secret = requireText(options.secret);
    const issuer = requireText(options.issuer);
    const audience = requireText(options.audience);
    const parts = assertion.split('.');
    if (parts.length !== 2 || parts.some((part) => part === '')) invalid();

    const expected = sign(parts[0], secret);
    const supplied = Buffer.from(parts[1], 'base64url');
    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected as any, supplied as any)
    ) {
      invalid();
    }

    const payload = JSON.parse(
      Buffer.from(parts[0], 'base64url').toString('utf8'),
    ) as Partial<AssertionPayload>;
    const now = (options.now ?? (() => Math.floor(Date.now() / 1000)))();
    if (
      payload.iss !== issuer ||
      payload.aud !== audience ||
      !Number.isInteger(payload.iat) ||
      !Number.isInteger(payload.exp) ||
      (payload.exp as number) - (payload.iat as number) > 60 ||
      now < (payload.iat as number) ||
      now >= (payload.exp as number)
    ) {
      invalid();
    }

    return {
      tenantId: requireText(payload.tenant_id),
      subject: requireText(payload.sub),
      userId: requireText(payload.user_id),
      scopes: Array.isArray(payload.scope)
        ? payload.scope.map(requireText)
        : [],
      issuedAt: payload.iat as number,
      expiresAt: payload.exp as number,
    };
  } catch {
    return invalid();
  }
}
