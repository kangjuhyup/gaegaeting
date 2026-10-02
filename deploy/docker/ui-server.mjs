import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { extname, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export function readPublicConfig(env) {
  if (env.UI_APP && !['user', 'admin'].includes(env.UI_APP)) throw new Error('Invalid UI_APP');
  const admin = env.UI_APP === 'admin';
  if (admin && (!env.UI_OIDC_CLIENT_ID || env.UI_OIDC_CLIENT_ID === 'gaegaeting-web')) {
    throw new Error('Admin UI requires its own UI_OIDC_CLIENT_ID');
  }
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
  const imageStorageUrl = env.UI_IMAGE_STORAGE_ORIGIN ? new URL(url('UI_IMAGE_STORAGE_ORIGIN')) : undefined;
  if (imageStorageUrl && (imageStorageUrl.pathname !== '/' || imageStorageUrl.search)) {
    throw new Error('UI_IMAGE_STORAGE_ORIGIN must be an HTTPS origin without path or query');
  }
  return {
    basePath: admin ? '/admin' : '',
    issuer,
    tenantCode,
    apiAudience: url('UI_API_AUDIENCE'),
    authOrigin: new URL(issuer).origin,
    clientId: env.UI_OIDC_CLIENT_ID || 'gaegaeting-web',
    accountUrl: url('UI_ACCOUNT_GRAPHQL_URL'),
    gatewayUrl: url('UI_GATEWAY_GRAPHQL_URL'),
    ...(imageStorageUrl ? { imageStorageOrigin: imageStorageUrl.origin } : {}),
  };
}

export function createUiServer(config, root = resolve('dist')) {
  const storageOrigin = config.imageStorageOrigin ? new URL(config.imageStorageOrigin).origin : '';
  const origins = [...new Set([config.authOrigin, new URL(config.accountUrl).origin, new URL(config.gatewayUrl).origin, storageOrigin].filter(Boolean))];
  const csp = `default-src 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: ${storageOrigin}; connect-src 'self' ${origins.join(' ')}; base-uri 'none'; frame-ancestors 'none'; form-action 'self' ${config.authOrigin}`;
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
  // Build the allowed asset table from the image at startup. Request paths never
  // become filesystem paths, and hidden files/symlinks are not served.
  const assets = new Map();
  const loadAssets = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const file = resolve(directory, entry.name);
      if (entry.isDirectory()) loadAssets(file);
      else if (entry.isFile()) assets.set('/' + relative(root, file).split(sep).join('/'), {
        body: readFileSync(file), type: types[extname(file)] ?? 'application/octet-stream',
      });
    }
  };
  loadAssets(root);
  const basePath = config.basePath || '';
  const routes = new Set(basePath === '/admin' ? ['/', '/login', '/interaction', '/image-review']
    : ['/', '/login', '/interaction', '/signup', '/profile', '/pet', '/recommendations']);
  return createServer((req, res) => {
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    try {
      let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (basePath) {
        if (path !== basePath && !path.startsWith(basePath + '/')) { res.writeHead(404).end(); return; }
        path = path.slice(basePath.length) || '/';
      }
      if (path === '/health') { res.writeHead(200).end(req.method === 'HEAD' ? undefined : 'ok'); return; }
      if (path === '/config.js') {
        res.setHeader('Content-Type', types['.js']);
        res.writeHead(200).end(req.method === 'HEAD' ? undefined : `window.GAEGAETING_CONFIG=${JSON.stringify(config)};`);
        return;
      }
      const asset = assets.get(routes.has(path) ? '/index.html' : path);
      if (!asset) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', asset.type);
      if (path.startsWith('/assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.writeHead(200).end(req.method === 'HEAD' ? undefined : asset.body);
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
