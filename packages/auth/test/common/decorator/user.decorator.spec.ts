import { UnauthorizedException } from '@nestjs/common';
import 'reflect-metadata';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

jest.mock('@nestjs/graphql', () => ({
  GqlExecutionContext: {
    create: jest.fn(),
  },
}));

describe('JwtPayload decorator', () => {
  const { GqlExecutionContext } = require('@nestjs/graphql');
  const { JwtPayload } = require('../../../src/common/decorator/user.decorator');

  const getFactory = () => {
    class TestController {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      handler(_u: any) {}
    }

    // 파라미터 데코레이터 적용
    JwtPayload()(TestController.prototype, 'handler', 0);

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

  test('HTTP: req.user가 있으면 그대로 반환', () => {
    const user = { userId: 'u1', tenantId: 't1' };
    const req: any = { headers: {}, user };
    const ctx: any = {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => req }),
    };
    expect(callFactory(ctx)).toBe(user);
  });

  test('HTTP: user가 없고 required=true면 UnauthorizedException', () => {
    const req: any = { headers: {} };
    const ctx: any = {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => req }),
    };
    expect(() => callFactory(ctx)).toThrow(UnauthorizedException);
  });

  test('HTTP: user가 없고 required=false면 null', () => {
    const req: any = { headers: {} };
    const ctx: any = {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => req }),
    };
    expect(callFactory(ctx, { required: false })).toBeNull();
  });

  test('GraphQL: gql context req.user가 있으면 반환', () => {
    const user = { userId: 'u1', tenantId: 't1' };
    const req: any = { headers: {}, user };
    (GqlExecutionContext.create as any).mockReturnValue({
      getContext: () => ({ req }),
    });
    const ctx: any = {
      getType: () => 'graphql',
    };
    expect(callFactory(ctx)).toBe(user);
  });
});


