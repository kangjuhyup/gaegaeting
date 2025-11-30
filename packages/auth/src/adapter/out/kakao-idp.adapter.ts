import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KakaoIdpPort, KakaoProfile, KakaoTokenResponse } from '../../application/port/kakao-idp.port';
import * as https from 'https';
import { URLSearchParams } from 'url';
import { ENV_KEY } from '../../common/config/env.config';

@Injectable()
export class KakaoIdpAdapter extends KakaoIdpPort {
  private readonly authBase = 'kauth.kakao.com';
  private readonly apiBase = 'kapi.kakao.com';

  constructor(private readonly configService: ConfigService) { super(); }

  async exchangeAuthCode(code: string, redirectUri?: string): Promise<KakaoTokenResponse> {
    const clientId = this.configService.get<string>(ENV_KEY.KAKAO_CLIENT_ID);
    const clientSecret = this.configService.get<string>(ENV_KEY.KAKAO_CLIENT_SECRET, '');
    const fallbackRedirect = this.configService.get<string>(ENV_KEY.KAKAO_REDIRECT_URI, '');
    const finalRedirect = redirectUri || fallbackRedirect;

    if (!clientId) throw new InternalServerErrorException('KAKAO_CLIENT_ID not configured');
    if (!finalRedirect) throw new InternalServerErrorException('KAKAO_REDIRECT_URI not configured');

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: finalRedirect,
      code,
    });
    if (clientSecret) params.append('client_secret', clientSecret);

    const body = params.toString();
    const path = `/oauth/token`;

    const res = await this.request({
      host: this.authBase,
      path: `${path}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body,
    });

    const data = JSON.parse(res.text);
    const accessToken = data.access_token as string;
    const refreshToken = data.refresh_token as string | undefined;
    const expiresIn = data.expires_in as number | undefined;
    if (!accessToken) throw new Error('Kakao token response missing access_token');
    return { accessToken, refreshToken, expiresIn };
  }

  async getProfile(accessToken: string): Promise<KakaoProfile> {
    const res = await this.request({
      host: this.apiBase,
      path: `/v2/user/me`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    });
    const data = JSON.parse(res.text);
    const id = String(data.id);
    const email = data.kakao_account?.email;
    const nickname = data.properties?.nickname || data.kakao_account?.profile?.nickname;
    return { id, email, nickname, raw: data };
  }

  private request(opts: { host: string; path: string; method: 'GET'|'POST'; headers?: Record<string, string>; body?: string }): Promise<{ status: number; text: string }> {
    return new Promise((resolve, reject) => {
      const req = https.request({
        host: opts.host,
        path: opts.path + (opts.method === 'GET' && opts.body ? `?${opts.body}` : ''),
        method: opts.method,
        headers: {
          ...(opts.headers || {}),
          ...(opts.body && opts.method !== 'GET' ? { 'Content-Length': Buffer.byteLength(opts.body).toString() } : {}),
        },
      }, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (d) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
        res.on('end', () => {
          const status = res.statusCode ?? 0;
          const text = Buffer.concat(chunks).toString('utf8');
          if (status >= 200 && status < 300) return resolve({ status, text });
          return reject(new Error(`Kakao API error: ${status} ${text}`));
        });
      });
      req.on('error', reject);
      if (opts.body && opts.method !== 'GET') req.write(opts.body);
      req.end();
    });
  }
}


