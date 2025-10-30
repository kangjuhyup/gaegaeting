// src/common/decorators/tenant.decorator.ts
import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';

let GqlExecutionContext: any;
try {
  GqlExecutionContext = require('@nestjs/graphql').GqlExecutionContext;
} catch {}

export interface TenantDecoratorOptions {
  /**
   * 없으면 400을 던질지 여부. 기본 true
   */
  required?: boolean;
  /**
   * 헤더가 없을 때 호스트에서 서브도메인으로 추출할지 여부. 기본 true
   * 예: acme.api.example.com -> "acme"
   */
  fallbackSubdomain?: boolean;
  /**
   * 서브도메인 추출 시 제거할 루트 도메인. 없으면 마지막 두 레이블을 루트로 간주
   * 예: "example.com"
   */
  rootDomain?: string;
  /**
   * 허용 정규식 (기본: /^[a-z0-9-_]{1,64}$/i)
   */
  allowPattern?: RegExp;
}

function parseFromHost(hostRaw: string | undefined, rootDomain?: string): string | null {
  if (!hostRaw) return null;
  const host = hostRaw.split(':')[0]; // 포트 제거
  const parts = host.split('.').filter(Boolean);

  if (parts.length <= 1) return null;

  if (rootDomain) {
    const root = rootDomain.split('.').filter(Boolean).join('.');
    const suffix = parts.slice(-root.split('.').length).join('.');
    if (suffix.toLowerCase() !== root.toLowerCase()) return null;
    const sub = parts.slice(0, parts.length - root.split('.').length).join('.');
    return sub || null;
  }

  // 기본: 마지막 두 레이블을 루트로 간주 (ex: example.com)
  if (parts.length < 3) return null;
  return parts.slice(0, parts.length - 2).join('.'); // acme.api.example.com -> "acme.api"
}

function normalizeSubdomainToTenant(sub: string | null): string | null {
  if (!sub) return null;
  return sub.split('.')[0];
}

export const Tenant = createParamDecorator(
  (opts: TenantDecoratorOptions | undefined, ctx: ExecutionContext): string | null => {
    const options: Required<TenantDecoratorOptions> = {
      required: true,
      fallbackSubdomain: true,
      rootDomain: undefined as any,
      allowPattern: /^[a-z0-9-_]{1,64}$/i,
      ...(opts ?? {}),
    };

    // 1) HTTP or GraphQL req 얻기
    let req: any;
    const type = ctx.getType<'http' | 'graphql' | 'rpc'>();

    if (type === 'http') {
      req = ctx.switchToHttp().getRequest();
    } else if (type === 'graphql' && GqlExecutionContext) {
      const g = GqlExecutionContext.create(ctx);
      req = g.getContext()?.req;
    } else {
      // RPC 등은 헤더 개념이 없을 수 있어 바로 종료
      req = undefined;
    }

    // 미들웨어/가드가 선행 설정한 값 우선
    let tenant: string | null = req?.tenant ?? null;

    // 2) 헤더에서 추출 (표준화된 소문자 키)
    if (!tenant) {
      const headerVal = req?.headers?.['x-tenant-id'] ?? req?.headers?.['x-tenant'] ?? null;
      tenant = headerVal ? String(headerVal) : null;
    }

    // 3) 필요하면 호스트에서 서브도메인 추출
    if (!tenant && options.fallbackSubdomain) {
      const host = req?.headers?.host ?? req?.hostname ?? null;
      const sub = normalizeSubdomainToTenant(parseFromHost(host, options.rootDomain));
      if (sub) tenant = sub;
    }

    // 4) 유효성 검증
    if (tenant && !options.allowPattern.test(tenant)) {
      throw new BadRequestException('Invalid X-Tenant-ID');
    }

    if (!tenant && options.required) {
      throw new BadRequestException('X-Tenant-ID is required');
    }

    if (req && tenant) req.tenant = tenant;

    return tenant;
  },
);