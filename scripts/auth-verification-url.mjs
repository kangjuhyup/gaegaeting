export function authVerificationUrl(value, issuer) {
  const trusted = new URL(issuer);
  const tenant = /^\/t\/([a-z0-9-]+)\/oidc$/.exec(trusted.pathname)?.[1];
  if (!tenant || !['http:', 'https:'].includes(trusted.protocol) || trusted.username || trusted.password) throw new Error('Invalid tenant issuer');
  const tenantPath = `/t/${tenant}/`;
  const parsed = new URL(value, issuer);
  if (parsed.origin !== trusted.origin || !parsed.pathname.startsWith(tenantPath) || parsed.username || parsed.password) throw new Error('Unsafe Auth URL');
  const route = parsed.pathname.slice(tenantPath.length);
  // Only OIDC authorization/resume and interaction routes may receive cookies.
  if (!/^(?:oidc\/auth(?:\/[A-Za-z0-9_-]+)?|interaction\/[A-Za-z0-9_-]+)$/.test(route)) throw new Error('Unexpected Auth redirect route');
  trusted.pathname = `${tenantPath}${route}`;
  trusted.search = parsed.search;
  trusted.hash = '';
  return trusted;
}
