import IORedis, { Cluster, Redis } from 'ioredis';
import type { RedisClientBuildOptions } from './redis.type';

/** 단일 클라이언트 생성 (cache / pubsub에서 주로 사용) */
export function createRedisClient(opts: RedisClientBuildOptions): Redis | Cluster {
  const mode = opts.client.mode;

  if (mode === 'single') {
    const { url, ...rest } = opts.client.options ?? {};
    return url ? new IORedis(url, rest) : new IORedis(rest);
  }

  if (mode === 'multi-single') {
    // 주의: 이 모드는 "여러 개" 반환이 의미 → createRedisClients 사용 권장
    // 필요 시 첫 번째만 반환 (ex. Cache/ PubSub에서 단일 커넥션 원할 때)
    const [first] = opts.client.urls;
    if (!first) throw new Error('multi-single requires at least one url');
    return new IORedis(first, opts.client.options);
  }

  if (mode === 'sentinel') {
    const sentinels = opts.client.urls.map((u) => {
      const { hostname, port } = new URL(u);
      return { host: hostname, port: Number(port) };
    });
    return new IORedis({ sentinels, name: opts.client.name, ...(opts.client.options ?? {}) });
  }

  if (mode === 'cluster') {
    return new Cluster(opts.client.nodes, opts.client.options);
  }

  throw new Error('Unknown redis client mode');
}

/** 여러 클라이언트 생성 (Redlock 등에서 필요) */
export function createRedisClients(opts: RedisClientBuildOptions): Array<Redis | Cluster> {
  const mode = opts.client.mode;

  if (mode === 'multi-single') {
    if (!opts.client.urls?.length) throw new Error('multi-single requires urls');
    return opts.client.urls.map((u) => new IORedis(u, opts.client.options));
  }

  // 나머지 모드도 “여러 개”가 필요하다면 배열로 감싸서 반환
  return [createRedisClient(opts)];
}