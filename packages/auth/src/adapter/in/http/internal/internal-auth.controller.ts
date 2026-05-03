import { TokenServicePort } from '@app/application/port/token-service.port';
import { Controller, Get, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Internal auth endpoint for edge middleware (e.g. Istio ext_authz)
 *
 * - If Authorization header is present, validates the JWT and returns `x-jwt-payload` header (base64 JSON).
 * - If Authorization header is missing, returns 200 without `x-jwt-payload`.
 */
@Controller('internal')
export class InternalAuthController {
  constructor(private readonly tokenService: TokenServicePort) {}

  @Get(['verify', 'verify/*'])
  async verify(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const authHeader = req.headers?.authorization;
    if (!authHeader) {
      return { ok: true };
    }

    const token = this.extractBearer(authHeader);
    if (!token) {
      throw new UnauthorizedException('Invalid Authorization header');
    }

    const metadata = await this.tokenService.verifyToken(token);
    if (!metadata) {
      throw new UnauthorizedException('Invalid token');
    }

    const payloadJson = JSON.stringify(metadata);
    const payloadB64 = Buffer.from(payloadJson, 'utf8').toString('base64');
    res.setHeader('x-jwt-payload', payloadB64);
    return { ok: true };
  }

  private extractBearer(authHeader: string): string | null {
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    return parts[1];
  }
}
