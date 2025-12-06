import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AuthApiPort, TokenFlags } from '../../../../domain/port/auth-api.port';

@Injectable()
export class AuthApiAdapter implements AuthApiPort {
  private readonly authServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.authServiceUrl =
      this.configService.get<string>('AUTH_SERVICE_URL') ||
      'http://localhost:3000';
  }

  async createTokenForUser(
    userId: string,
    socialProvider: string,
    socialId: string,
    flags?: TokenFlags,
  ): Promise<string> {
    const response = await firstValueFrom(
      this.httpService.post(`${this.authServiceUrl}/internal/tokens`, {
        userId,
        socialProvider,
        socialId,
        ...flags,
      }),
    );

    return response.data.accessToken;
  }
}
