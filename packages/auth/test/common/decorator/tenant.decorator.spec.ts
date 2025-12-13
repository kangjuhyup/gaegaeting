import { BadRequestException } from '@nestjs/common';
import 'reflect-metadata';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

// tenant.decorator.ts는 runtime에 @nestjs/graphql을 require하므로, 먼저 mock을 깔아줍니다.
jest.mock('@nestjs/graphql', () => ({
  GqlExecutionContext: {
    create: jest.fn(),
  },
}));

describe('Tenant decorator', () => {
  const { GqlExecutionContext } = require('@nestjs/graphql');
  const { Tenant } = require('../../../src/common/decorator/tenant.decorator');

  const getFactory = () => {
    class TestController {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      handler(_t: any) {}
    }

    Tenant()(TestController.prototype, 'handler', 0);

    const meta =
      Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'handler') ??
      Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController.prototype.constructor, 'handler');

    const first = Object.values(meta ?? {})[0] as any;
    if (!first?.factory) {
      throw new Error('Failed to resolve param decorator factory');
    }
    return first.factory as (data: any, ctx: any) => any;
  };

  const callFactory = (ctx: any, opts?: any) => {
    const factory = getFactory();
    return factory(opts, ctx);
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('HTTP: req.tenant가 있으면 그대로 반환하고 req.tenant 유지', () => {
    const req: any = { tenant: 't1', headers: {} };
    const ctx: any = {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => req }),
    };
    expect(callFactory(ctx)).toBe('t1');
    expect(req.tenant).toBe('t1');
  });

  test('HTTP: x-tenant-id 헤더에서 tenant를 추출한다', () => {
    const req: any = { headers: { 'x-tenant-id': 'acme' } };
    const ctx: any = {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => req }),
    };
    expect(callFactory(ctx)).toBe('acme');
    expect(req.tenant).toBe('acme');
  });

  test('HTTP: 헤더 없으면 host 서브도메인에서 tenant를 추출한다 (기본 옵션)', () => {
    const req: any = { headers: { host: 'acme.api.example.com' } };
    const ctx: any = {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => req }),
    };
    expect(callFactory(ctx)).toBe('acme');
    expect(req.tenant).toBe('acme');
  });

  test('HTTP: tenant가 없고 required=true면 400', () => {
    const req: any = { headers: {} };
    const ctx: any = {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => req }),
    };
    expect(() => callFactory(ctx)).toThrow(BadRequestException);
  });

  test('HTTP: tenant가 없고 required=false면 null', () => {
    const req: any = { headers: {} };
    const ctx: any = {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => req }),
    };
    expect(callFactory(ctx, { required: false })).toBeNull();
  });

  test('HTTP: tenant가 allowPattern에 맞지 않으면 400', () => {
    const req: any = { headers: { 'x-tenant-id': 'bad tenant!' } };
    const ctx: any = {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => req }),
    };
    expect(() => callFactory(ctx)).toThrow(BadRequestException);
  });

  test('GraphQL: gql context req.headers에서 tenant를 추출한다', () => {
    const req: any = { headers: { 'x-tenant-id': 't1' } };
    (GqlExecutionContext.create as any).mockReturnValue({
      getContext: () => ({ req }),
    });
    const ctx: any = {
      getType: () => 'graphql',
    };
    expect(callFactory(ctx)).toBe('t1');
    expect(req.tenant).toBe('t1');
  });
});


