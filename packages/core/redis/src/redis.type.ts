import type { ClusterNode, ClusterOptions, RedisOptions, SentinelConnectionOptions } from 'ioredis';

export type RedisSingleOptions = { url?: string } & RedisOptions;

/** 모든 모듈이 공유하는 연결 모드 */
export type RedisClientMode =
  | { mode: 'single'; options?: RedisSingleOptions }                                   // 단일 노드
  | { mode: 'multi-single'; urls: string[]; options?: RedisOptions }                   // 독립 단일 노드 여러 개 (Redlock 권장)
  | { mode: 'sentinel'; urls: string[]; name: string; options?: Omit<SentinelConnectionOptions,'sentinels'|'name'> } // Sentinel 세트
  | { mode: 'cluster'; nodes: ClusterNode[]; options?: ClusterOptions };               // ioredis Cluster

export interface RedisClientBuildOptions {
  client: RedisClientMode;
}

export interface RedisClientWithPrefix {
  prefix?: string; // 키 프리픽스가 필요한 모듈에서 사용
}