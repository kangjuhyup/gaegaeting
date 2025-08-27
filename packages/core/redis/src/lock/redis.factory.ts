import Redis, { Cluster } from 'ioredis';
import { RedlockModuleOptions } from './lock.type';

export function createRedisClients(opts: RedlockModuleOptions): (Redis | Cluster)[] {
  const mode = opts.clients.mode;

  if (mode === 'single') {
    const { url, ...rest } = opts.clients.options ?? {};
    return [url ? new Redis(url, rest) : new Redis(rest)];
  }

  if (mode === 'multi-single') {
    const conns = opts.clients.urls.map((u) => new Redis(u, opts.clients.options));
    return conns;
  }

  if (mode === 'sentinel') {
    const sentinels = opts.clients.urls.map((u) => {
      const { hostname, port } = new URL(u);
      return { host: hostname, port: Number(port) };
    });
    return [new Redis({ sentinels, name: opts.clients.name, ...(opts.clients.options ?? {}) })];
  }

  if (mode === 'cluster') {
    return [new Cluster(opts.clients.nodes, opts.clients.options)];
  }

  return [];
}