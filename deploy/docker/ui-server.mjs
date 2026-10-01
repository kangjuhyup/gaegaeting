import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export function readPublicConfig(env) {
  const url = (name) => {
    if (!env[name]) throw new Error(`${name} is required`);
    const value = new URL(env[name]);
    if (value.protocol !== 'https:' || value.username || value.password || value.hash) {
      throw new Error(`${name} must be a public HTTPS URL`);
    }
    return value.href.replace(/\/$/, '');
  };
  const issuer = url('UI_OIDC_ISSUER');
  const tenantCode = /^\/t\/([a-z0-9-]+)\/oidc$/.exec(new URL(issuer).pathname)?.[1];
  if (!tenantCode) throw new Error('UI_OIDC_ISSUER must identify a tenant');
  return {
    issuer,
    tenantCode,
    apiAudience: url('UI_API_AUDIENCE'),
    authOrigin: new URL(issuer).origin,
    clientId: env.UI_OIDC_CLIENT_ID || 'gaegaeting-web',
    accountUrl: url('UI_ACCOUNT_GRAPHQL_URL'),
    gatewayUrl: url('UI_GATEWAY_GRAPHQL_URL'),
  };
}

export function createUiServer(config, root = resolve('dist')) {
  const origins = [...new Set([config.authOrigin, new URL(config.accountUrl).origin, new URL(config.gatewayUrl).origin])];
  const csp = `default-src 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' ${origins.join(' ')}; base-uri 'none'; frame-ancestors 'none'; form-action 'self' ${config.authOrigin}`;
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
  const routes = new Set(['/', '/login', '/interaction', '/signup', '/profile', '/pet', '/recommendations']);
  return createServer(async (req, res) => {
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (path === '/health') { res.writeHead(200).end(req.method === 'HEAD' ? undefined : 'ok'); return; }
      if (path === '/config.js') {
        res.setHeader('Content-Type', types['.js']);
        res.writeHead(200).end(req.method === 'HEAD' ? undefined : `window.GAEGAETING_CONFIG=${JSON.stringify(config)};`);
        return;
      }
      const file = resolve(root, routes.has(path) ? 'index.html' : `.${path}`);
      if (!file.startsWith(`${root}${sep}`) || path.split('/').some(part => part.startsWith('.'))) {
        res.writeHead(404).end(); return;
      }
      const body = await readFile(file);
      res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
      if (path.startsWith('/assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.writeHead(200).end(req.method === 'HEAD' ? undefined : body);
    } catch { res.writeHead(404).end(); }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.UI_PORT ?? 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid UI_PORT');
  const server = createUiServer(readPublicConfig(process.env));
  server.listen(port, '0.0.0.0', () => console.log(`Integration UI listening on ${port}`));
  process.on('SIGTERM', () => server.close());
}
