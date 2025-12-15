import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPort, JwtSignOptions, JwtVerifyOptions, JwtPayload } from '../../application/port/jwt.port';

@Injectable()
export class JwtAdapter extends JwtPort {
  constructor(
    private readonly jwtService: JwtService,
  ) {
    super();
  }

  async sign(payload: any, options: JwtSignOptions): Promise<string> {
    return await this.jwtService.signAsync(payload, {
      secret: options.secret,
      ...(options.expiresIn !== undefined ? { expiresIn: options.expiresIn } : {}),
    });
  }

  async verify(token: string, options: JwtVerifyOptions): Promise<JwtPayload> {
    return await this.jwtService.verifyAsync(token, { secret: options.secret }) as JwtPayload;
  }
}

