#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = fileURLToPath(new URL('..', import.meta.url));
const available = ['account', 'match', 'gateway'];

export function serviceEnvironment(service, environment = process.env) {
  let local = {};
  try {
    local = parseEnv(readFileSync(new URL(`../packages/${service}/.env`, import.meta.url), 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return { NODE_ENV: 'development', ...local, ...environment };
}

export async function main(args = process.argv.slice(2)) {
  if (args.includes('--help')) {
    console.log('사용법: pnpm dev [account match gateway] — 서비스별 .env 또는 주입된 환경변수로 앱 빌드 후 병렬 실행');
    return;
  }
  const services = [...new Set(args.length ? args : available)];
  const invalid = services.filter(service => !available.includes(service));
  if (invalid.length) throw new Error(`지원하지 않는 서비스: ${invalid.join(', ')} (가능: ${available.join(', ')})`);
  if (!process.env.npm_execpath) throw new Error('pnpm dev 명령으로 실행하세요.');
  const config = { ...process.env };
  const children = new Set();
  const controller = new AbortController();
  let stopping = false;
  let killTimer;
  function stop(code) {
    if (stopping) return;
    stopping = true;
    process.exitCode = code;
    controller.abort();
    for (const child of children) signal(child, 'SIGTERM');
    killTimer = setTimeout(() => {
      for (const child of children) signal(child, 'SIGKILL');
    }, 5000);
    killTimer.unref();
  }
  function signal(child, name) {
    try {
      if (process.platform === 'win32') child.kill(name);
      else process.kill(-child.pid, name);
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  }
  process.once('SIGINT', () => stop(130));
  process.once('SIGTERM', () => stop(143));
  function run(pnpmArgs, env = config, persistent = false) {
    if (stopping) return Promise.reject(new Error('서비스 실행이 중단되었습니다.'));
    const child = spawn(process.execPath, [process.env.npm_execpath, ...pnpmArgs], {
      cwd: root, env, stdio: 'inherit', detached: process.platform !== 'win32',
    });
    children.add(child);
    return new Promise((resolve, reject) => {
      child.once('error', error => { children.delete(child); reject(error); });
      child.once('exit', (code, sig) => {
        children.delete(child);
        if (persistent && !stopping) stop(code || 1);
        if (code === 0) resolve();
        else reject(new Error(`${pnpmArgs.join(' ')} 종료 (${sig || code})`));
      });
    });
  }
  try {
    await run(['build:workspaces']);
    for (const service of services.filter(s => s !== 'gateway')) {
      console.log(`[dev] ${service} 시작`);
      void run(['--filter', service, 'start:prod'], serviceEnvironment(service, config), true).catch(error => {
        if (!stopping) { console.error(error.message); stop(1); }
      });
    }
    if (services.includes('gateway')) {
      console.log('[dev] account·match GraphQL 준비 대기 (최대 120초)');
      const deadline = Date.now() + 120_000;
      const gatewayEnvironment = serviceEnvironment('gateway', config);
      for (const [service, url] of [
        ['account', gatewayEnvironment.ACCOUNT_SERVICE_URL || 'http://127.0.0.1:2800/account/graphql'],
        ['match', gatewayEnvironment.MATCH_SERVICE_URL || 'http://127.0.0.1:2801/match/graphql'],
      ]) {
        let ready = false;
        while (!stopping && Date.now() < deadline) {
          try {
            const response = await fetch(url, {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ query: '{ _service { sdl } }' }),
              signal: AbortSignal.any([controller.signal, AbortSignal.timeout(2000)]),
            });
            const body = await response.json();
            if (response.ok && body.data?._service?.sdl) { ready = true; break; }
          } catch { /* Retry while the subgraph starts. */ }
          await delay(500, undefined, { signal: controller.signal });
        }
        if (!ready) throw new Error(`${service} 준비 실패. 서비스 로그와 연결 환경변수를 확인하세요.`);
      }
      await run(['--filter', 'gateway', 'start:prod'], serviceEnvironment('gateway', config), true);
    }
  } catch (error) {
    if (!stopping) { console.error(error.message); stop(1); }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
