import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { ENV_KEY } from '#app/config/env.config';

@Injectable()
export class RegistrationServiceGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const authorization = context.switchToHttp().getRequest<{ headers: { authorization?: string } }>().headers.authorization;
    const presented = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    const expected = this.config.getOrThrow<string>(ENV_KEY.REGISTRATION_SERVICE_TOKEN);
    const left = Buffer.from(presented);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      throw new UnauthorizedException('Invalid registration service credential');
    }
    return true;
  }
}
