// src/common/decorator/user.decorator.ts
import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { User } from '@app/domain/model/user';

let GqlExecutionContext: any;
try {
  GqlExecutionContext = require('@nestjs/graphql').GqlExecutionContext;
} catch {}

export interface UserDecoratorOptions {
  /**
   * 사용자 정보가 없을 때 예외를 던질지 여부. 기본 true
   */
  required?: boolean;
}

export interface JwtPayload {
  sub: string;
  tenantId: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

export const UserPayload = createParamDecorator(
  (opts: UserDecoratorOptions | undefined, ctx: ExecutionContext): User | null => {
    const options: Required<UserDecoratorOptions> = {
      required: true,
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
      req = undefined;
    }

    // 2) GraphqlAuthGuard가 설정한 User 도메인 모델 가져오기
    const user = req?._userDomainModel as User | undefined;

    if (!user) {
      if (options.required) {
        throw new UnauthorizedException('인증된 사용자 정보가 없습니다.');
      }
      return null;
    }

    return user;
  },
);

