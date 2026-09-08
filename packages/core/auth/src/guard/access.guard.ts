import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorator/permissions.decorator.js';
import { ROLES_KEY } from '../decorator/roles.decorator.js';
import { SCOPES_KEY } from '../decorator/scopes.decorator.js';
import { InternalAuthService } from '../service/internal-auth.service.js';

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private readonly auth: InternalAuthService, private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    try {
      const assertion = request.headers?.['x-gaegaeting-principal'];
      if (typeof assertion !== 'string' || assertion === '') throw new Error('missing');
      request.user = this.auth.verify(assertion);
      this.assertAuthorization(context, request.user);
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new UnauthorizedException('유효한 내부 인증 정보가 없습니다.');
    }
  }

  private assertAuthorization(context: ExecutionContext, principal: any): void {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [context.getHandler(), context.getClass()]) ?? [];
    const permissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) ?? [];
    const scopes = this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [context.getHandler(), context.getClass()]) ?? [];
    const actualRoles = Array.isArray(principal?.roles) ? principal.roles : [];
    const actualPermissions = Array.isArray(principal?.permissions) ? principal.permissions : [];
    const actualScopes = Array.isArray(principal?.scopes) ? principal.scopes : [];
    if ((roles.length && !roles.some((role) => actualRoles.includes(role))) ||
        (permissions.length && !permissions.some((permission) => actualPermissions.includes(permission))) ||
        (scopes.length && !scopes.every((scope) => actualScopes.includes(scope)))) {
      throw new ForbiddenException('권한이 없습니다.');
    }
  }
}
